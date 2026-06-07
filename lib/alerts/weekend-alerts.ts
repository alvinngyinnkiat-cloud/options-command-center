import { getTickerWeekendReviewFlags } from "@/lib/watchlist/analysis-card";
import type { WatchlistScannerRow } from "@/lib/watchlist/types";
import type { WeekendReviewStatus } from "@/lib/weekend-review/types";
import { buildAlertKey } from "./keys";
import type { EnrichedAlert } from "./types";

export function buildWeekendReviewAlerts(
  rows: WatchlistScannerRow[],
  reviewStatus: WeekendReviewStatus
): EnrichedAlert[] {
  const alerts: EnrichedAlert[] = [];
  const today = new Date().toISOString().split("T")[0];

  for (const row of rows) {
    const flags = getTickerWeekendReviewFlags(row, reviewStatus);
    const ticker = row.ticker;

    if (!flags.updatedThisWeekend && row.supportResistance.support1 != null) {
      alerts.push({
        id: buildAlertKey("weekend", "sr_not_updated", ticker),
        key: buildAlertKey("weekend", "sr_not_updated", ticker),
        alertType: "weekend",
        ticker,
        severity: "warning",
        message: `${ticker} manual S/R not updated this weekend (last: ${row.supportResistance.updateDate}).`,
        suggestedAction: "Run Weekend Review",
        status: "active",
        createdDate: today,
      });
    }

    if (flags.needsReview) {
      alerts.push({
        id: buildAlertKey("weekend", "needs_review", ticker),
        key: buildAlertKey("weekend", "needs_review", ticker),
        alertType: "weekend",
        ticker,
        severity: reviewStatus.isDue ? "critical" : "warning",
        message: `${ticker} needs weekend review — S/R or rankings may be stale.`,
        suggestedAction: "Run Weekend Review",
        status: "active",
        createdDate: today,
      });
    }
  }

  return alerts;
}
