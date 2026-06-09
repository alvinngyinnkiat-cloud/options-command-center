import {
  applyAlertStatuses,
  buildAllAlerts,
} from "@/lib/alerts/aggregate";
import type { EnrichedAlert } from "@/lib/alerts/types";
import { getAggregatedIntelligenceImpacts } from "@/lib/supabase/queries/market-intelligence";
import { loadPersistedAlertStatuses } from "@/lib/supabase/queries/alerts-center";
import { getOptionsTradesData } from "@/lib/supabase/queries/options-trades";
import { getRiskDashboardData } from "@/lib/supabase/queries/risk-dashboard";
import { getWatchlistScannerData } from "@/lib/supabase/queries/watchlist-scanner";
import { getWeekendReviewStatus } from "@/lib/supabase/queries/weekly-market-updates";
import { buildReadinessForRows } from "@/lib/trading-workflow/readiness";
import { buildMarketCondition } from "@/lib/trading-workflow/market-condition";
import type { WatchlistScannerData } from "@/lib/watchlist/types";
import type { WeekendReviewStatus } from "@/lib/weekend-review/types";
import type { TradeReadinessResult } from "@/lib/trading-workflow/types";

export interface WatchlistPageData {
  scanner: WatchlistScannerData;
  reviewStatus: WeekendReviewStatus;
  alerts: EnrichedAlert[];
  readinessByTicker: Record<string, TradeReadinessResult>;
}

/**
 * Read-only loader for /watchlist — Supabase reads only, no external market APIs.
 */
export async function getWatchlistPageData(): Promise<WatchlistPageData> {
  const intelligenceMap = await getAggregatedIntelligenceImpacts();

  const [scanner, tradesData, riskData, alertStatuses] = await Promise.all([
    getWatchlistScannerData({ persistScores: false, intelligenceMap }),
    getOptionsTradesData(),
    getRiskDashboardData(),
    loadPersistedAlertStatuses(),
  ]);

  const reviewStatus = await getWeekendReviewStatus(
    scanner.rows.length,
    scanner.dataSource
  );

  const rawAlerts = buildAllAlerts({
    watchlistRows: scanner.rows,
    trades: tradesData.trades,
    riskData,
    reviewStatus,
  });
  const alerts = applyAlertStatuses(rawAlerts, alertStatuses);

  const marketCondition = buildMarketCondition(scanner.rows, intelligenceMap);
  const allReadiness = buildReadinessForRows(scanner.rows, {
    openTrades: tradesData.trades,
    liquidityBase: riskData.capitalLiquidity,
    reviewStatus,
    marketCondition,
  });

  return {
    scanner,
    reviewStatus,
    alerts,
    readinessByTicker: Object.fromEntries(
      allReadiness.map((r) => [r.ticker, r])
    ),
  };
}
