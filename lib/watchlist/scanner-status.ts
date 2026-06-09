import { fetchActiveWatchlistItems } from "@/lib/watchlist/active-watchlist";
import { lastCompletedTradingDate } from "@/lib/market-calendar/nyse-calendar";
import { getMarketDataSourceBreakdown } from "@/lib/watchlist/market-data-source-breakdown";
import {
  describeDataSourceSummary,
  DAILY_AUTO_REFRESH_LABEL,
  formatNextScheduledRefresh,
  formatSingaporeTimestamp,
  WATCHLIST_SCHEDULED_LOG_SOURCE,
} from "@/lib/watchlist/scheduled-refresh-config";
import { getLastLogForSource } from "@/lib/supabase/queries/data-source-logs";
import { isSupabaseConfigured } from "@/lib/supabase/is-configured";
import { withSupabaseQuery } from "@/lib/supabase/resolve-user";
import type { MarketData, TechnicalIndicator } from "@/types/database";

export interface WatchlistScannerHealthStatus {
  lastCandleDate: string | null;
  lastRefreshTime: string | null;
  lastAutomatedRefresh: string | null;
  indicatorsUpdated: boolean;
  scannerReady: boolean;
  completedCandleTarget: string;
  dataSourceSummary: string;
  scheduledRefreshLabel: string;
  nextScheduledRefresh: string;
  nextScheduledRefreshDate: string;
  tickersWithCandles: number;
  tickersWithIndicators: number;
  activeTickers: number;
  staleTickers: string[];
  missingIndicatorTickers: string[];
  failedTickers: string[];
  unsupportedTickers: string[];
}

function emptyStatus(
  completedCandleTarget: string
): WatchlistScannerHealthStatus {
  return {
    lastCandleDate: null,
    lastRefreshTime: null,
    lastAutomatedRefresh: null,
    indicatorsUpdated: false,
    scannerReady: false,
    completedCandleTarget,
    dataSourceSummary: "—",
    scheduledRefreshLabel: DAILY_AUTO_REFRESH_LABEL,
    nextScheduledRefresh: formatNextScheduledRefresh().combined,
    nextScheduledRefreshDate: formatNextScheduledRefresh().dateLine,
    tickersWithCandles: 0,
    tickersWithIndicators: 0,
    activeTickers: 0,
    staleTickers: [],
    missingIndicatorTickers: [],
    failedTickers: [],
    unsupportedTickers: [],
  };
}

export async function getWatchlistScannerHealthStatus(
  userId: string,
  now: Date = new Date()
): Promise<WatchlistScannerHealthStatus> {
  const completedCandleTarget = lastCompletedTradingDate(now);

  if (!isSupabaseConfigured()) {
    return emptyStatus(completedCandleTarget);
  }

  const items = await fetchActiveWatchlistItems();
  const activeTickers = items.length;
  const ids = items.map((i) => i.id);

  if (ids.length === 0) {
    const [logs, scheduled] = await Promise.all([
      getLastLogForSource(userId, "market_data"),
      getLastLogForSource(userId, WATCHLIST_SCHEDULED_LOG_SOURCE),
    ]);
    return {
      ...emptyStatus(completedCandleTarget),
      lastRefreshTime: logs.success?.completed_at ?? null,
      lastAutomatedRefresh: formatSingaporeTimestamp(
        scheduled.success?.completed_at ?? null
      ),
    };
  }

  const { marketRows, indicatorRows, logs, scheduled, sources } =
    await withSupabaseQuery(
    async ({ userId: queryUserId, supabase }) => {
      const [marketRes, techRes, logResult, scheduledLog, sourceBreakdown] =
        await Promise.all([
        supabase
          .from("market_data")
          .select("watchlist_id, ticker, price_date")
          .in("watchlist_id", ids)
          .eq("price_date", completedCandleTarget),
        supabase
          .from("technical_indicators")
          .select("watchlist_id, ticker")
          .eq("user_id", queryUserId)
          .in("watchlist_id", ids)
          .eq("indicator_date", completedCandleTarget),
        getLastLogForSource(queryUserId, "market_data"),
        getLastLogForSource(queryUserId, WATCHLIST_SCHEDULED_LOG_SOURCE),
        getMarketDataSourceBreakdown(now),
      ]);

      return {
        marketRows: (marketRes.data ?? []) as Pick<
          MarketData,
          "watchlist_id" | "ticker" | "price_date"
        >[],
        indicatorRows: (techRes.data ?? []) as Pick<
          TechnicalIndicator,
          "watchlist_id" | "ticker"
        >[],
        logs: logResult,
        scheduled: scheduledLog,
        sources: sourceBreakdown,
      };
    },
    async () => ({
      marketRows: [] as Pick<MarketData, "watchlist_id" | "ticker" | "price_date">[],
      indicatorRows: [] as Pick<TechnicalIndicator, "watchlist_id" | "ticker">[],
      logs: await getLastLogForSource(userId, "market_data"),
      scheduled: await getLastLogForSource(userId, WATCHLIST_SCHEDULED_LOG_SOURCE),
      sources: await getMarketDataSourceBreakdown(now),
    })
  );

  const candleByWatchlist = new Map(
    marketRows.map((r) => [r.watchlist_id, r])
  );

  const indicatorWatchlistIds = new Set(
    indicatorRows.map((r) => r.watchlist_id)
  );

  const staleTickers: string[] = [];
  const missingIndicatorTickers: string[] = [];
  const failedTickers = sources.failedSymbols;
  const failedSet = new Set(failedTickers.map((t) => t.toUpperCase()));

  for (const item of items) {
    const ticker = item.ticker.toUpperCase();
    if (failedSet.has(ticker)) continue;

    const candle = candleByWatchlist.get(item.id);
    if (!candle) {
      staleTickers.push(item.ticker);
    }
    if (!indicatorWatchlistIds.has(item.id)) {
      missingIndicatorTickers.push(item.ticker);
    }
  }

  const unsupportedTickers = failedTickers;

  const candleDates = marketRows.map((r) => r.price_date);
  const lastCandleDate =
    candleDates.length > 0
      ? candleDates.sort((a, b) => b.localeCompare(a))[0]!
      : null;

  const lastRefreshTime = logs.success?.completed_at ?? null;
  const lastAutomatedRefresh = formatSingaporeTimestamp(
    scheduled.success?.completed_at ?? null
  );
  const indicatorsUpdated =
    missingIndicatorTickers.length === 0 && indicatorRows.length > 0;

  const tickersWithCandles = marketRows.length;
  const dataSourceSummary = describeDataSourceSummary(sources);
  const marketDataSourcesSucceeded =
    sources.fmpCount + sources.yahooCount + sources.otherCount > 0;

  const scannerReady =
    activeTickers > 0 &&
    completedCandleTarget.length > 0 &&
    indicatorsUpdated &&
    missingIndicatorTickers.length === 0 &&
    marketDataSourcesSucceeded &&
    (lastCandleDate != null || tickersWithCandles > 0);

  const nextRefresh = formatNextScheduledRefresh(now);

  return {
    lastCandleDate,
    lastRefreshTime,
    lastAutomatedRefresh,
    indicatorsUpdated,
    scannerReady,
    completedCandleTarget,
    dataSourceSummary,
    scheduledRefreshLabel: DAILY_AUTO_REFRESH_LABEL,
    nextScheduledRefresh: nextRefresh.combined,
    nextScheduledRefreshDate: nextRefresh.dateLine,
    tickersWithCandles,
    tickersWithIndicators: indicatorWatchlistIds.size,
    activeTickers,
    staleTickers,
    missingIndicatorTickers,
    failedTickers,
    unsupportedTickers,
  };
}
