import type { RiskDashboardData } from "@/lib/risk/types";
import type { WatchlistScannerRow } from "@/lib/watchlist/types";
import type { EnrichedTrade } from "@/lib/trades/types";
import type { WeekendReviewStatus } from "@/lib/weekend-review/types";
import { buildPriceAlerts } from "./price-alerts";
import { buildRiskCenterAlerts } from "./risk-alerts";
import { buildScannerAlerts } from "./scanner-alerts";
import { buildAlertsSummary } from "./summary";
import { buildTradeManagementAlerts } from "./trade-management-alerts";
import type { AlertStatus, AlertsCenterData, EnrichedAlert } from "./types";
import { buildWeekendReviewAlerts } from "./weekend-alerts";

export function applyAlertStatuses(
  alerts: EnrichedAlert[],
  statusMap: Map<string, AlertStatus>
): EnrichedAlert[] {
  return alerts.map((alert) => ({
    ...alert,
    status: statusMap.get(alert.key) ?? alert.status,
  }));
}

export function buildAllAlerts(input: {
  watchlistRows: WatchlistScannerRow[];
  trades: EnrichedTrade[];
  riskData: RiskDashboardData;
  reviewStatus: WeekendReviewStatus;
}): EnrichedAlert[] {
  const openTrades = input.riskData.openTrades;

  return [
    ...buildScannerAlerts(input.watchlistRows),
    ...buildPriceAlerts(input.watchlistRows),
    ...buildTradeManagementAlerts(input.trades),
    ...buildRiskCenterAlerts(input.riskData.summary, openTrades),
    ...buildWeekendReviewAlerts(input.watchlistRows, input.reviewStatus),
  ].sort((a, b) => {
    const severityOrder = { critical: 0, warning: 1, info: 2 };
    const diff = severityOrder[a.severity] - severityOrder[b.severity];
    if (diff !== 0) return diff;
    return b.createdDate.localeCompare(a.createdDate);
  });
}

export function buildAlertsCenterData(
  alerts: EnrichedAlert[],
  dataSource: "supabase" | "mock"
): AlertsCenterData {
  return {
    alerts,
    summary: buildAlertsSummary(alerts),
    dataSource,
  };
}
