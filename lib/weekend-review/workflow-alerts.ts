import { ALERT_SCORE_THRESHOLD } from "@/lib/alerts/constants";
import { buildAlertKey } from "@/lib/alerts/keys";
import { isAveragePriceNearResistance, isAveragePriceNearSupport } from "@/lib/alerts/proximity";
import type { EnrichedAlert } from "@/lib/alerts/types";
import { getTickerWeekendReviewFlags } from "@/lib/watchlist/analysis-card";
import type { WatchlistScannerRow } from "@/lib/watchlist/types";
import type { WeeklyMarketUpdateRecord } from "./types";
import type { WeekendReviewStatus } from "./types";

function previousSnapshotForTicker(
  history: WeeklyMarketUpdateRecord[],
  watchlistId: string,
  currentWeekEnding: string | null
): WeeklyMarketUpdateRecord | undefined {
  return history.find(
    (h) =>
      h.watchlistId === watchlistId &&
      h.weekEnding !== currentWeekEnding &&
      h.recommendedStrategy != null
  );
}

export function buildWeekendWorkflowAlerts(
  rows: WatchlistScannerRow[],
  reviewStatus: WeekendReviewStatus,
  history: WeeklyMarketUpdateRecord[]
): EnrichedAlert[] {
  const alerts: EnrichedAlert[] = [];
  const today = new Date().toISOString().split("T")[0];

  for (const row of rows) {
    const ticker = row.ticker;
    const score = row.score;
    const flags = getTickerWeekendReviewFlags(row, reviewStatus);

    if (!flags.updatedThisWeekend) {
      alerts.push({
        id: buildAlertKey("weekend", "sr_not_updated", ticker),
        key: buildAlertKey("weekend", "sr_not_updated", ticker),
        alertType: "weekend",
        ticker,
        severity: "warning",
        message: `${ticker} manual S/R not updated this weekend.`,
        suggestedAction: "Update Support/Resistance",
        status: "active",
        createdDate: today,
      });
    }

    if (score && score.totalScore >= ALERT_SCORE_THRESHOLD) {
      alerts.push({
        id: buildAlertKey("weekend", "score_high", ticker),
        key: buildAlertKey("weekend", "score_high", ticker),
        alertType: "weekend",
        ticker,
        severity: "info",
        message: `${ticker} score ${score.totalScore} ≥ ${ALERT_SCORE_THRESHOLD}.`,
        suggestedAction: score.recommendation.actionLabel,
        status: "active",
        createdDate: today,
      });
    }

    const prev = previousSnapshotForTicker(
      history,
      row.watchlistId,
      reviewStatus.weekEnding
    );
    const currentStrategy = score?.recommendation.recommendedStrategy;
    const currentAction = score?.recommendation.actionLabel;

    if (
      prev?.recommendedStrategy &&
      currentStrategy &&
      prev.recommendedStrategy !== currentStrategy
    ) {
      alerts.push({
        id: buildAlertKey("weekend", "strategy_changed", ticker),
        key: buildAlertKey("weekend", "strategy_changed", ticker),
        alertType: "weekend",
        ticker,
        severity: "warning",
        message: `${ticker} strategy changed: ${prev.recommendedStrategy} → ${currentStrategy}.`,
        suggestedAction: "Review Setup",
        status: "active",
        createdDate: today,
      });
    }

    if (
      prev?.action &&
      currentAction &&
      prev.action === "No Trade" &&
      (currentAction === "Watchlist" || currentAction === "Strong Candidate")
    ) {
      alerts.push({
        id: buildAlertKey("weekend", "action_upgraded", ticker),
        key: buildAlertKey("weekend", "action_upgraded", ticker),
        alertType: "weekend",
        ticker,
        severity: "info",
        message: `${ticker} action upgraded: No Trade → ${currentAction}.`,
        suggestedAction: currentAction,
        status: "active",
        createdDate: today,
      });
    }

    const avg = row.market.averagePrice;
    const sr = row.supportResistance;
    const atr = row.technicals.atr14;

    if (isAveragePriceNearSupport(avg, sr.support1, atr)) {
      alerts.push({
        id: buildAlertKey("weekend", "near_support", ticker),
        key: buildAlertKey("weekend", "near_support", ticker),
        alertType: "weekend",
        ticker,
        severity: "warning",
        message: `${ticker} average price near manual Support 1.`,
        suggestedAction: "Review Position",
        status: "active",
        createdDate: today,
      });
    }

    if (isAveragePriceNearResistance(avg, sr.resistance1, atr)) {
      alerts.push({
        id: buildAlertKey("weekend", "near_resistance", ticker),
        key: buildAlertKey("weekend", "near_resistance", ticker),
        alertType: "weekend",
        ticker,
        severity: "warning",
        message: `${ticker} average price near manual Resistance 1.`,
        suggestedAction: "Review Position",
        status: "active",
        createdDate: today,
      });
    }
  }

  return alerts;
}
