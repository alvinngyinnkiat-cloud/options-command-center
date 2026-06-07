import type { AlertCategory, AlertsCenterSummary, EnrichedAlert } from "./types";

export function buildAlertsSummary(alerts: EnrichedAlert[]): AlertsCenterSummary {
  const active = alerts.filter((a) => a.status === "active");
  const byType: Record<AlertCategory, number> = {
    scanner: 0,
    price: 0,
    trade: 0,
    risk: 0,
    weekend: 0,
  };

  for (const alert of active) {
    byType[alert.alertType]++;
  }

  return {
    total: alerts.length,
    active: active.length,
    critical: active.filter((a) => a.severity === "critical").length,
    warning: active.filter((a) => a.severity === "warning").length,
    info: active.filter((a) => a.severity === "info").length,
    byType,
  };
}

export function filterAlertsByTicker(
  alerts: EnrichedAlert[],
  ticker: string
): EnrichedAlert[] {
  return alerts.filter(
    (a) => a.ticker?.toUpperCase() === ticker.toUpperCase() && a.status === "active"
  );
}

export function hasActiveAlertsForTicker(
  alerts: EnrichedAlert[],
  ticker: string
): boolean {
  return filterAlertsByTicker(alerts, ticker).length > 0;
}

export function getHighestSeverity(
  alerts: EnrichedAlert[]
): "critical" | "warning" | "info" | null {
  const active = alerts.filter((a) => a.status === "active");
  if (active.some((a) => a.severity === "critical")) return "critical";
  if (active.some((a) => a.severity === "warning")) return "warning";
  if (active.some((a) => a.severity === "info")) return "info";
  return null;
}
