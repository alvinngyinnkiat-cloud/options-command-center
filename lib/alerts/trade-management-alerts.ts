import type { EnrichedTrade } from "@/lib/trades/types";
import { ALERT_DTE_THRESHOLD, ALERT_TAKE_PROFIT_PCT } from "./constants";
import { buildAlertKey } from "./keys";
import { isAveragePriceNearLevel } from "./proximity";
import type { EnrichedAlert } from "./types";

export function buildTradeManagementAlerts(
  trades: EnrichedTrade[]
): EnrichedAlert[] {
  const alerts: EnrichedAlert[] = [];
  const today = new Date().toISOString().split("T")[0];

  for (const trade of trades) {
    if (
      trade.status !== "open" &&
      trade.status !== "managed" &&
      trade.status !== "closing"
    ) {
      continue;
    }

    const calc = trade.calculations;
    const ticker = trade.ticker;

    if (calc.dte < ALERT_DTE_THRESHOLD) {
      alerts.push({
        id: buildAlertKey("trade", "dte_low", ticker),
        key: buildAlertKey("trade", `dte_low:${trade.id}`, ticker),
        alertType: "trade",
        ticker,
        severity: "warning",
        message: `${ticker} DTE ${calc.dte} — expiration within ${ALERT_DTE_THRESHOLD} days.`,
        suggestedAction: "Close Position",
        status: "active",
        createdDate: trade.entryDate,
      });
    }

    if (calc.currentPnl >= calc.takeProfitPrice) {
      alerts.push({
        id: buildAlertKey("trade", "profit_target", ticker),
        key: buildAlertKey("trade", `profit_target:${trade.id}`, ticker),
        alertType: "trade",
        ticker,
        severity: "info",
        message: `${ticker} profit $${calc.currentPnl.toFixed(0)} ≥ ${ALERT_TAKE_PROFIT_PCT}% of premium ($${calc.takeProfitPrice.toFixed(0)}).`,
        suggestedAction: "Close Position",
        status: "active",
        createdDate: today,
      });
    }

    const breakeven =
      trade.strategy === "bear_call_spread"
        ? calc.breakevenCall
        : calc.breakevenPut;

    if (
      trade.underlyingAveragePrice != null &&
      breakeven != null &&
      isAveragePriceNearLevel(trade.underlyingAveragePrice, breakeven)
    ) {
      alerts.push({
        id: buildAlertKey("trade", "near_breakeven", ticker),
        key: buildAlertKey("trade", `near_breakeven:${trade.id}`, ticker),
        alertType: "trade",
        ticker,
        severity: "warning",
        message: `${ticker} underlying average price near breakeven (${calc.breakevenDisplay}).`,
        suggestedAction: "Review Position",
        status: "active",
        createdDate: today,
      });
    }
  }

  return alerts;
}
