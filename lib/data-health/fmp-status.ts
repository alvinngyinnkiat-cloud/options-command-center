import type { TickerSyncDiagnostic } from "@/lib/watchlist/sync-watchlist-data";
import {
  getMarketDataSourceBreakdown,
  resolveMarketDataSourceBreakdown,
} from "@/lib/watchlist/market-data-source-breakdown";
import { countActiveWatchlistItems } from "@/lib/watchlist/active-watchlist";
import {
  probeMarketDataForTicker,
  type TickerMarketDataProbeResult,
} from "@/lib/watchlist/market-data-probe";
import {
  fmpStatusToHealthBadge,
  FMP_STATUS_LABELS,
  runFmpDiagnostics,
  type FmpConnectionStatus,
} from "@/lib/watchlist/fmp-diagnostics";
import { lastCompletedTradingDate } from "@/lib/market-calendar/nyse-calendar";
import { getLastLogForSource } from "@/lib/supabase/queries/data-source-logs";
import { getWatchlistScannerHealthStatus } from "@/lib/watchlist/scanner-status";
import { withSupabaseQuery } from "@/lib/supabase/resolve-user";
import { isSupabaseConfigured } from "@/lib/supabase/is-configured";
import type { DataSourceHealthStatus } from "@/lib/data-health/types";

export interface FailedTickerMarketDataDetail {
  ticker: string;
  fmpError: string | null;
  yahooError: string | null;
  finalStatus: "failed";
}

export interface FmpHealthDiagnostics {
  status: FmpConnectionStatus;
  statusLabel: string;
  healthBadge: DataSourceHealthStatus;
  apiKeyConfigured: boolean;
  apiReachable: boolean;
  remainingQuota: string | null;
  endpoint: string;
  activeTickerCount: number;
  tickersUpdated: number;
  failedTickers: string[];
  failedTickerDetails: FailedTickerMarketDataDetail[];
  lastSuccessfulRefresh: string | null;
  latestCompletedCandleDate: string | null;
  completedCandleTarget: string;
  probeError: string | null;
  fmpSymbols: string[];
  yahooSymbols: string[];
  fmpSymbolCount: number;
  yahooSymbolCount: number;
  failedSymbolCount: number;
  lastSyncTickerDiagnostics: TickerSyncDiagnostic[];
}

function mapBadge(status: FmpConnectionStatus): DataSourceHealthStatus {
  const badge = fmpStatusToHealthBadge(status);
  if (badge === "healthy") return "healthy";
  if (badge === "warning") return "warning";
  return "failed";
}

async function countTickersWithOhlcv(): Promise<number> {
  if (!isSupabaseConfigured()) return 0;

  const { fetchActiveWatchlistItems } = await import(
    "@/lib/watchlist/active-watchlist"
  );
  const items = await fetchActiveWatchlistItems();
  const ids = items.map((i) => i.id);
  if (ids.length === 0) return 0;

  const completedTarget = lastCompletedTradingDate();

  return withSupabaseQuery(
    async ({ supabase }) => {
      const { data } = await supabase
        .from("market_data")
        .select("watchlist_id")
        .in("watchlist_id", ids)
        .eq("price_date", completedTarget);

      return (data ?? []).length;
    },
    () => 0
  );
}

function toFailedDetail(probe: TickerMarketDataProbeResult): FailedTickerMarketDataDetail {
  return {
    ticker: probe.symbol,
    fmpError: probe.fmpError,
    yahooError: probe.yahooError,
    finalStatus: "failed",
  };
}

async function probeFailedTickers(
  tickers: string[]
): Promise<FailedTickerMarketDataDetail[]> {
  const unique = [...new Set(tickers.map((t) => t.toUpperCase()))];
  if (unique.length === 0) return [];

  const probes = await Promise.all(
    unique.slice(0, 20).map((ticker) => probeMarketDataForTicker(ticker))
  );

  return probes
    .filter((p) => p.finalStatus === "failed")
    .map(toFailedDetail);
}

export async function getFmpHealthDiagnostics(
  userId: string,
  lastSyncTickerDiagnostics: TickerSyncDiagnostic[] = []
): Promise<FmpHealthDiagnostics> {
  const completedCandleTarget = lastCompletedTradingDate();
  const [fmp, activeTickerCount, tickersUpdated, scannerStatus, logs, dbSources] =
    await Promise.all([
      runFmpDiagnostics(),
      countActiveWatchlistItems(),
      countTickersWithOhlcv(),
      getWatchlistScannerHealthStatus(userId),
      getLastLogForSource(userId, "market_data"),
      getMarketDataSourceBreakdown(),
    ]);

  const sources = resolveMarketDataSourceBreakdown(
    dbSources,
    lastSyncTickerDiagnostics
  );

  const failedTickers = sources.failedSymbols;
  const failedTickerDetails = await probeFailedTickers(failedTickers);

  let status = fmp.status;
  let statusLabel = fmp.statusLabel;
  if (
    status === "connected" &&
    fmp.apiKeyConfigured &&
    activeTickerCount > 0 &&
    tickersUpdated === 0
  ) {
    status = "no_data_returned";
    statusLabel = FMP_STATUS_LABELS.no_data_returned;
  }

  return {
    status,
    statusLabel,
    healthBadge: mapBadge(status),
    apiKeyConfigured: fmp.apiKeyConfigured,
    apiReachable: fmp.apiReachable,
    remainingQuota: fmp.remainingQuota,
    endpoint: fmp.endpoint,
    activeTickerCount,
    tickersUpdated,
    failedTickers,
    failedTickerDetails,
    lastSuccessfulRefresh: logs.success?.completed_at ?? null,
    latestCompletedCandleDate: scannerStatus.lastCandleDate,
    completedCandleTarget,
    probeError: fmp.probeError,
    fmpSymbols: sources.fmpSymbols,
    yahooSymbols: sources.yahooSymbols,
    fmpSymbolCount: sources.fmpCount,
    yahooSymbolCount: sources.yahooCount,
    failedSymbolCount: sources.failedCount,
    lastSyncTickerDiagnostics,
  };
}
