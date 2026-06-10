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
import type { WatchlistScannerData } from "@/lib/watchlist/types";
import type { WeekendReviewStatus } from "@/lib/weekend-review/types";

export interface WatchlistPageData {
  scanner: WatchlistScannerData;
  reviewStatus: WeekendReviewStatus;
  alerts: EnrichedAlert[];
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

  return {
    scanner,
    reviewStatus,
    alerts,
  };
}
