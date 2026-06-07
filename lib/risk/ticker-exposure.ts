import { calculatePositionRiskPct } from "./calculations";
import { RISK_CONCENTRATION_THRESHOLD_PCT, RISK_TOP_LARGEST_COUNT } from "./constants";
import type { EnrichedTrade } from "@/lib/trades/types";
import type { TickerExposureRow } from "./types";

function buildStatusLabel(flags: {
  isDuplicate: boolean;
  isConcentrated: boolean;
  isLargest: boolean;
}): string {
  const parts: string[] = [];
  if (flags.isDuplicate) parts.push("Duplicate");
  if (flags.isConcentrated) parts.push("Concentrated");
  if (flags.isLargest) parts.push("Largest");
  return parts.length > 0 ? parts.join(" · ") : "Open";
}

export function buildTickerExposureRows(
  openTrades: EnrichedTrade[],
  maximumOptionsCapital: number
): TickerExposureRow[] {
  const tickerCounts = new Map<string, number>();
  for (const t of openTrades) {
    tickerCounts.set(t.ticker, (tickerCounts.get(t.ticker) ?? 0) + 1);
  }

  const sortedByRisk = [...openTrades].sort(
    (a, b) => b.calculations.maxRisk - a.calculations.maxRisk
  );
  const largestTradeIds = new Set(
    sortedByRisk.slice(0, RISK_TOP_LARGEST_COUNT).map((t) => t.id)
  );

  return openTrades
    .map((t) => {
      const riskPct = calculatePositionRiskPct(
        t.calculations.maxRisk,
        maximumOptionsCapital
      );
      const isDuplicate = (tickerCounts.get(t.ticker) ?? 0) > 1;
      const isConcentrated = riskPct >= RISK_CONCENTRATION_THRESHOLD_PCT;
      const isLargest = largestTradeIds.has(t.id);

      return {
        tradeId: t.id,
        ticker: t.ticker,
        strategy: t.strategyLabel,
        maxRisk: t.calculations.maxRisk,
        currentPnl: t.pnlAllocation?.myPnl ?? t.calculations.currentPnl,
        riskPct,
        isDuplicate,
        isConcentrated,
        isLargest,
        statusLabel: buildStatusLabel({ isDuplicate, isConcentrated, isLargest }),
      };
    })
    .sort((a, b) => b.maxRisk - a.maxRisk);
}
