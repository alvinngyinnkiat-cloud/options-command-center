import { fetchActiveWatchlistItems } from "@/lib/watchlist/active-watchlist";
import { lastCompletedTradingDate } from "@/lib/market-calendar/nyse-calendar";
import { isSupabaseConfigured } from "@/lib/supabase/is-configured";
import { withSupabaseQuery } from "@/lib/supabase/resolve-user";
import type { TickerSyncDiagnostic } from "@/lib/watchlist/sync-watchlist-data";
import type { MarketData } from "@/types/database";

export type MarketDataStoredSource = "fmp" | "yahoo" | "other";

export interface MarketDataSourceBreakdown {
  fmpSymbols: string[];
  yahooSymbols: string[];
  otherSymbols: string[];
  failedSymbols: string[];
  fmpCount: number;
  yahooCount: number;
  otherCount: number;
  failedCount: number;
}

const EMPTY_BREAKDOWN: MarketDataSourceBreakdown = {
  fmpSymbols: [],
  yahooSymbols: [],
  otherSymbols: [],
  failedSymbols: [],
  fmpCount: 0,
  yahooCount: 0,
  otherCount: 0,
  failedCount: 0,
};

function normalizeSource(value: string | null | undefined): MarketDataStoredSource {
  const s = (value ?? "").toLowerCase();
  if (s === "fmp") return "fmp";
  if (s === "yahoo") return "yahoo";
  return "other";
}

function finalizeBreakdown(
  fmpSymbols: string[],
  yahooSymbols: string[],
  otherSymbols: string[],
  failedSymbols: string[]
): MarketDataSourceBreakdown {
  fmpSymbols.sort();
  yahooSymbols.sort();
  otherSymbols.sort();
  failedSymbols.sort();

  return {
    fmpSymbols,
    yahooSymbols,
    otherSymbols,
    failedSymbols,
    fmpCount: fmpSymbols.length,
    yahooCount: yahooSymbols.length,
    otherCount: otherSymbols.length,
    failedCount: failedSymbols.length,
  };
}

/** Authoritative counts from the latest refresh run (matches per-ticker table). */
export function buildMarketDataSourceBreakdownFromDiagnostics(
  diagnostics: TickerSyncDiagnostic[]
): MarketDataSourceBreakdown {
  if (diagnostics.length === 0) return { ...EMPTY_BREAKDOWN };

  const fmpSymbols: string[] = [];
  const yahooSymbols: string[] = [];
  const otherSymbols: string[] = [];
  const failedSymbols: string[] = [];

  for (const row of diagnostics) {
    if (row.status === "failed") {
      failedSymbols.push(row.symbol);
      continue;
    }

    if (row.selectedSource === "fmp") {
      fmpSymbols.push(row.symbol);
    } else if (row.selectedSource === "yahoo") {
      yahooSymbols.push(row.symbol);
    } else {
      failedSymbols.push(row.symbol);
    }
  }

  return finalizeBreakdown(fmpSymbols, yahooSymbols, otherSymbols, failedSymbols);
}

export function resolveMarketDataSourceBreakdown(
  dbBreakdown: MarketDataSourceBreakdown,
  diagnostics: TickerSyncDiagnostic[]
): MarketDataSourceBreakdown {
  if (diagnostics.length > 0) {
    return buildMarketDataSourceBreakdownFromDiagnostics(diagnostics);
  }
  return dbBreakdown;
}

function classifyTickerSource(
  ticker: string,
  row: MarketData | undefined,
  completedTarget: string,
  fmpSymbols: string[],
  yahooSymbols: string[],
  otherSymbols: string[],
  failedSymbols: string[]
): void {
  if (!row || row.price_date < completedTarget) {
    failedSymbols.push(ticker);
    return;
  }

  const kind = normalizeSource(row.source);
  if (kind === "fmp") fmpSymbols.push(ticker);
  else if (kind === "yahoo") yahooSymbols.push(ticker);
  else otherSymbols.push(ticker);
}

export async function getMarketDataSourceBreakdown(
  now: Date = new Date()
): Promise<MarketDataSourceBreakdown> {
  if (!isSupabaseConfigured()) return { ...EMPTY_BREAKDOWN };

  const items = await fetchActiveWatchlistItems();
  const ids = items.map((i) => i.id);
  if (ids.length === 0) return { ...EMPTY_BREAKDOWN };

  const completedTarget = lastCompletedTradingDate(now);

  return withSupabaseQuery(
    async ({ supabase }) => {
      const { data: targetRows, error: targetError } = await supabase
        .from("market_data")
        .select("watchlist_id, ticker, price_date, source")
        .in("watchlist_id", ids)
        .eq("price_date", completedTarget);

      if (targetError) return { ...EMPTY_BREAKDOWN };

      const rowAtTarget = new Map<string, MarketData>();
      for (const row of (targetRows ?? []) as MarketData[]) {
        rowAtTarget.set(row.watchlist_id, row);
      }

      const missingIds = ids.filter((id) => !rowAtTarget.has(id));
      if (missingIds.length > 0) {
        const { data: fallbackRows } = await supabase
          .from("market_data")
          .select("watchlist_id, ticker, price_date, source")
          .in("watchlist_id", missingIds)
          .lte("price_date", completedTarget)
          .order("price_date", { ascending: false });

        for (const row of (fallbackRows ?? []) as MarketData[]) {
          if (!rowAtTarget.has(row.watchlist_id)) {
            rowAtTarget.set(row.watchlist_id, row);
          }
        }
      }

      const fmpSymbols: string[] = [];
      const yahooSymbols: string[] = [];
      const otherSymbols: string[] = [];
      const failedSymbols: string[] = [];

      for (const item of items) {
        classifyTickerSource(
          item.ticker,
          rowAtTarget.get(item.id),
          completedTarget,
          fmpSymbols,
          yahooSymbols,
          otherSymbols,
          failedSymbols
        );
      }

      return finalizeBreakdown(
        fmpSymbols,
        yahooSymbols,
        otherSymbols,
        failedSymbols
      );
    },
    () => ({ ...EMPTY_BREAKDOWN })
  );
}
