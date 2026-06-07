import type { WatchlistScannerRow } from "@/lib/watchlist/types";
import type { WeekendRankingEntry } from "./types";

export function buildWeekendRankings(
  rows: WatchlistScannerRow[]
): WeekendRankingEntry[] {
  const scored = rows
    .filter((r) => r.score)
    .sort(
      (a, b) =>
        (b.score?.combinedScore ?? b.score?.totalScore ?? 0) -
          (a.score?.combinedScore ?? a.score?.totalScore ?? 0) ||
        a.ticker.localeCompare(b.ticker)
    );

  return scored.map((row, index) => {
    const score = row.score!;
    const rec = score.recommendation;
    return {
      rank: index + 1,
      watchlistId: row.watchlistId,
      ticker: row.ticker,
      currentPrice: row.market.currentPrice,
      averagePrice: row.market.averagePrice,
      previousDayAveragePrice: row.averagePriceComparison.previousAverage,
      averagePriceChangePct: row.averagePriceComparison.differencePct,
      averagePricePositionPct: row.averagePricePosition.positionPct,
      averagePricePositionLabel: row.averagePricePosition.label,
      averagePricePositionZone: row.averagePricePosition.zone,
      totalScore: score.combinedScore ?? score.totalScore,
      decisionLabel: score.combinedDecisionLabel ?? rec.decisionLabel,
      recommendedStrategy: rec.recommendedStrategy,
      action: rec.action,
      primaryReason: rec.primaryReason,
    };
  });
}
