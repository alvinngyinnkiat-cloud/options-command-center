import { calculateMidPoint } from "@/lib/watchlist/support-resistance-mid";
import type { WatchlistScannerRow } from "@/lib/watchlist/types";
import { buildAlertKey } from "./keys";
import {
  isAveragePriceNearLevel,
  isAveragePriceNearResistance,
  isAveragePriceNearSupport,
} from "./proximity";
import type { EnrichedAlert } from "./types";

export function buildPriceAlerts(rows: WatchlistScannerRow[]): EnrichedAlert[] {
  const alerts: EnrichedAlert[] = [];
  const today = new Date().toISOString().split("T")[0];

  for (const row of rows) {
    const avg = row.market.averagePrice;
    const sr = row.supportResistance;
    const atr = row.technicals.atr14;
    const ticker = row.ticker;

    if (isAveragePriceNearSupport(avg, sr.support1, atr)) {
      alerts.push({
        id: buildAlertKey("price", "near_support", ticker),
        key: buildAlertKey("price", "near_support", ticker),
        alertType: "price",
        ticker,
        severity: "warning",
        message: `${ticker} average price ${avg.toFixed(2)} near manual Support 1 (${sr.support1}) — S/R manual only.`,
        suggestedAction: "Review Position",
        status: "active",
        createdDate: today,
      });
    }

    if (isAveragePriceNearResistance(avg, sr.resistance1, atr)) {
      alerts.push({
        id: buildAlertKey("price", "near_resistance", ticker),
        key: buildAlertKey("price", "near_resistance", ticker),
        alertType: "price",
        ticker,
        severity: "warning",
        message: `${ticker} average price ${avg.toFixed(2)} near manual Resistance 1 (${sr.resistance1}) — S/R manual only.`,
        suggestedAction: "Review Position",
        status: "active",
        createdDate: today,
      });
    }

    const mid = calculateMidPoint(sr.support1, sr.resistance1);
    if (mid != null && isAveragePriceNearLevel(avg, mid)) {
      alerts.push({
        id: buildAlertKey("price", "near_midpoint", ticker),
        key: buildAlertKey("price", "near_midpoint", ticker),
        alertType: "price",
        ticker,
        severity: "info",
        message: `${ticker} average price ${avg.toFixed(2)} near S/R mid point (${mid.toFixed(2)}).`,
        suggestedAction: "Watchlist",
        status: "active",
        createdDate: today,
      });
    }
  }

  return alerts;
}
