import { MOCK_REFERENCE_DATE } from "@/lib/mock/reference-dates";
import { buildMockScannerRows } from "@/lib/mock/watchlist-scanner";
import { isSupabaseConfigured } from "@/lib/supabase/is-configured";
import {
  isStaleUnderlyingPriceDate,
  UNAVAILABLE_UNDERLYING_SNAPSHOT,
  type UnderlyingPriceSnapshot,
  type UnderlyingPriceSource,
} from "@/lib/trades/underlying-price-types";

export type {
  UnderlyingPriceSnapshot,
  UnderlyingPriceSource,
} from "@/lib/trades/underlying-price-types";

export {
  formatUnderlyingPriceSourceLabel,
  isStaleUnderlyingPriceDate,
  UNAVAILABLE_UNDERLYING_SNAPSHOT,
  UNDERLYING_PRICE_STALE_DAYS,
} from "@/lib/trades/underlying-price-types";

function mockCurrentPriceByTicker(): Map<string, number> {
  const map = new Map<string, number>();
  for (const row of buildMockScannerRows()) {
    map.set(row.ticker.toUpperCase(), row.market.currentPrice);
  }
  return map;
}

function marketDataUsable(
  row: { price_date: string; source: string },
  mode: "supabase" | "mock"
): boolean {
  if (mode !== "supabase") return true;
  if (row.source === "mock") return false;
  return !isStaleUnderlyingPriceDate(row.price_date);
}

interface MarketDataRow {
  close: number;
  price_date: string;
  source: string;
}

async function fetchLatestMarketDataByTicker(
  tickers: string[],
  userId?: string
): Promise<Map<string, MarketDataRow>> {
  const map = new Map<string, MarketDataRow>();
  if (!isSupabaseConfigured() || !userId || tickers.length === 0) return map;

  const { withSupabaseQuery } = await import("@/lib/supabase/resolve-user");

  return withSupabaseQuery(
    async ({ userId: effectiveUserId, supabase }) => {
      const { data } = await supabase
        .from("market_data")
        .select("ticker, close, price_date, source, watchlist!inner(user_id)")
        .eq("watchlist.user_id", effectiveUserId)
        .in("ticker", tickers)
        .order("price_date", { ascending: false });

      const result = new Map<string, MarketDataRow>();
      for (const row of data ?? []) {
        const ticker = (row as { ticker: string }).ticker.toUpperCase();
        if (result.has(ticker)) continue;
        result.set(ticker, {
          close: Number((row as { close: number }).close),
          price_date: (row as { price_date: string }).price_date,
          source: (row as { source: string }).source ?? "manual",
        });
      }
      return result;
    },
    () => map
  );
}

interface HoldingPriceRow {
  price: number;
  last_updated: string;
}

async function fetchHoldingsPriceByTicker(
  tickers: string[],
  userId?: string
): Promise<Map<string, HoldingPriceRow>> {
  const map = new Map<string, HoldingPriceRow>();
  if (!isSupabaseConfigured() || !userId || tickers.length === 0) return map;

  const { withSupabaseQuery } = await import("@/lib/supabase/resolve-user");

  return withSupabaseQuery(
    async ({ userId: effectiveUserId, supabase }) => {
      const { data } = await supabase
        .from("stock_etf_holdings")
        .select("ticker, current_value_native, shares_held, last_updated")
        .eq("user_id", effectiveUserId)
        .in("ticker", tickers);

      const result = new Map<string, HoldingPriceRow>();
      for (const row of data ?? []) {
        const ticker = (row as { ticker: string }).ticker.toUpperCase();
        const shares = Number((row as { shares_held: number | null }).shares_held);
        const value = Number(
          (row as { current_value_native: number }).current_value_native
        );
        if (!(shares > 0) || !(value > 0)) continue;
        result.set(ticker, {
          price: value / shares,
          last_updated: (row as { last_updated: string }).last_updated,
        });
      }
      return result;
    },
    () => map
  );
}

function snapshotFromMarketData(
  row: MarketDataRow,
  mode: "supabase" | "mock"
): UnderlyingPriceSnapshot {
  const mockLike = row.source === "mock";
  const source: UnderlyingPriceSource = mockLike ? "mock" : "market_data";
  return {
    price: row.close,
    source,
    updatedAt: row.price_date,
    isUsable: marketDataUsable(row, mode),
  };
}

function snapshotFromHoldings(row: HoldingPriceRow): UnderlyingPriceSnapshot {
  const updatedAt = row.last_updated.slice(0, 10);
  return {
    price: row.price,
    source: "stock_etf_holdings",
    updatedAt: row.last_updated,
    isUsable: !isStaleUnderlyingPriceDate(updatedAt),
  };
}

/**
 * Resolves underlying prices for options breakeven safety.
 * Live (supabase) mode: market_data → stock_etf_holdings — never mock fallback.
 * Mock mode: mock scanner prices only.
 */
export async function resolveUnderlyingPriceSnapshots(
  tickers: string[],
  userId: string | undefined,
  mode: "supabase" | "mock"
): Promise<Map<string, UnderlyingPriceSnapshot>> {
  const unique = [
    ...new Set(tickers.map((t) => t.trim().toUpperCase()).filter(Boolean)),
  ];
  const result = new Map<string, UnderlyingPriceSnapshot>();

  if (mode === "mock") {
    const mock = mockCurrentPriceByTicker();
    for (const ticker of unique) {
      const price = mock.get(ticker);
      if (price == null) continue;
      result.set(ticker, {
        price,
        source: "mock",
        updatedAt: MOCK_REFERENCE_DATE,
        isUsable: true,
      });
    }
    return result;
  }

  const [marketByTicker, holdingsByTicker] = await Promise.all([
    fetchLatestMarketDataByTicker(unique, userId),
    fetchHoldingsPriceByTicker(unique, userId),
  ]);

  for (const ticker of unique) {
    const market = marketByTicker.get(ticker);
    if (market) {
      result.set(ticker, snapshotFromMarketData(market, mode));
      continue;
    }

    const holding = holdingsByTicker.get(ticker);
    if (holding) {
      result.set(ticker, snapshotFromHoldings(holding));
      continue;
    }

    result.set(ticker, { ...UNAVAILABLE_UNDERLYING_SNAPSHOT });
  }

  return result;
}

/** @deprecated Use resolveUnderlyingPriceSnapshots */
export async function resolveUnderlyingCurrentPrices(
  tickers: string[],
  userId?: string,
  options?: { includeMockFallback?: boolean }
): Promise<Map<string, number>> {
  const mode =
    options?.includeMockFallback === false ? "supabase" : "mock";
  const snapshots = await resolveUnderlyingPriceSnapshots(
    tickers,
    userId,
    mode
  );
  const result = new Map<string, number>();
  for (const [ticker, snap] of snapshots) {
    if (snap.isUsable && snap.price != null) {
      result.set(ticker, snap.price);
    }
  }
  return result;
}
