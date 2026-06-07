import type { RiskDashboardSummary } from "@/lib/risk/types";
import type { EnrichedTrade } from "@/lib/trades/types";
import {
  ALERT_LOW_CAPACITY_PCT,
  ALERT_MAX_OPTIONS_ALLOCATION_PCT,
} from "./constants";
import { buildAlertKey } from "./keys";
import type { EnrichedAlert } from "./types";

export function buildRiskCenterAlerts(
  summary: RiskDashboardSummary,
  openTrades: EnrichedTrade[]
): EnrichedAlert[] {
  const alerts: EnrichedAlert[] = [];
  const today = new Date().toISOString().split("T")[0];

  if (summary.optionsAllocationPct > ALERT_MAX_OPTIONS_ALLOCATION_PCT) {
    alerts.push({
      id: buildAlertKey("risk", "allocation_exceeded", null),
      key: buildAlertKey("risk", "allocation_exceeded", null),
      alertType: "risk",
      ticker: null,
      severity: "critical",
      message: `Options allocation ${summary.optionsAllocationPct.toFixed(1)}% exceeds ${ALERT_MAX_OPTIONS_ALLOCATION_PCT}% maximum.`,
      suggestedAction: "Reduce Exposure",
      status: "active",
      createdDate: today,
    });
  }

  const capacityPct =
    summary.maximumOptionsCapital > 0
      ? (summary.availableRiskCapacity / summary.maximumOptionsCapital) * 100
      : 0;

  if (capacityPct < ALERT_LOW_CAPACITY_PCT) {
    alerts.push({
      id: buildAlertKey("risk", "low_capacity", null),
      key: buildAlertKey("risk", "low_capacity", null),
      alertType: "risk",
      ticker: null,
      severity: "warning",
      message: `Available risk capacity low — ${capacityPct.toFixed(1)}% of max options capital remaining ($${summary.availableRiskCapacity.toFixed(0)}).`,
      suggestedAction: "Hold New Entries",
      status: "active",
      createdDate: today,
    });
  }

  for (const trade of openTrades) {
    if (trade.calculations.maxRisk > summary.maximumRiskPerTrade) {
      alerts.push({
        id: buildAlertKey("risk", "exceeds_max_risk", trade.ticker),
        key: buildAlertKey("risk", `exceeds_max_risk:${trade.id}`, trade.ticker),
        alertType: "risk",
        ticker: trade.ticker,
        severity: "critical",
        message: `${trade.ticker} max risk $${trade.calculations.maxRisk.toFixed(0)} exceeds per-trade limit $${summary.maximumRiskPerTrade.toFixed(0)}.`,
        suggestedAction: "Reduce Size",
        status: "active",
        createdDate: today,
      });
    }
  }

  return alerts;
}
