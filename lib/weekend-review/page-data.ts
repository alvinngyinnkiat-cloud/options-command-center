import type { WatchlistScannerRow } from "@/lib/watchlist/types";
import { buildWeekendOpportunityLists } from "./opportunities";
import { buildTickerReviewStatusRows } from "./review-status";
import { buildWeekendReviewSummary } from "./summary";
import { buildWeekendWorkflowAlerts } from "./workflow-alerts";
import type {
  WeekendReviewPageData,
  WeekendReviewStatus,
  WeeklyMarketUpdateRecord,
} from "./types";

export function buildWeekendReviewPageData(input: {
  rows: WatchlistScannerRow[];
  status: WeekendReviewStatus;
  history: WeeklyMarketUpdateRecord[];
  dataSource: "supabase" | "mock";
}): WeekendReviewPageData {
  return {
    rows: input.rows,
    status: input.status,
    history: input.history,
    summary: buildWeekendReviewSummary(input.rows, input.status),
    opportunities: buildWeekendOpportunityLists(input.rows),
    reviewStatusRows: buildTickerReviewStatusRows(input.rows, input.status),
    alerts: buildWeekendWorkflowAlerts(
      input.rows,
      input.status,
      input.history
    ),
    dataSource: input.dataSource,
  };
}
