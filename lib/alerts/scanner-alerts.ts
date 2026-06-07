import type { WatchlistScannerRow } from "@/lib/watchlist/types";
import { ALERT_SCORE_THRESHOLD } from "./constants";
import { buildAlertKey } from "./keys";
import type { EnrichedAlert } from "./types";

const STRATEGY_CODES: Record<string, string> = {
  "Bull Put": "strategy_bull_put",
  "Bear Call": "strategy_bear_call",
  "Iron Condor": "strategy_iron_condor",
};

export function buildScannerAlerts(rows: WatchlistScannerRow[]): EnrichedAlert[] {
  const alerts: EnrichedAlert[] = [];
  const today = new Date().toISOString().split("T")[0];

  for (const row of rows) {
    const score = row.score;
    if (!score) continue;

    const ticker = row.ticker;
    const rec = score.recommendation;

    if (score.totalScore >= ALERT_SCORE_THRESHOLD) {
      alerts.push({
        id: buildAlertKey("scanner", "score_high", ticker),
        key: buildAlertKey("scanner", "score_high", ticker),
        alertType: "scanner",
        ticker,
        severity: "info",
        message: `${ticker} scanner score ${score.totalScore} ≥ ${ALERT_SCORE_THRESHOLD} — ${rec.decisionLabel}.`,
        suggestedAction: rec.actionLabel,
        status: "active",
        createdDate: score.scoreDate ?? today,
      });
    }

    const strategy = rec.recommendedStrategy;
    const code = STRATEGY_CODES[strategy];
    if (code && strategy !== "No Trade") {
      alerts.push({
        id: buildAlertKey("scanner", code, ticker),
        key: buildAlertKey("scanner", code, ticker),
        alertType: "scanner",
        ticker,
        severity: score.totalScore >= ALERT_SCORE_THRESHOLD ? "info" : "warning",
        message: `${ticker} strategy signal: ${strategy} — ${rec.primaryReason}`,
        suggestedAction: rec.actionLabel,
        status: "active",
        createdDate: score.scoreDate ?? today,
      });
    }
  }

  return alerts;
}
