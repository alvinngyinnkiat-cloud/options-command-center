import type { WatchlistScannerRow } from "@/lib/watchlist/types";
import type { WeeklyMarketUpdateRecord } from "./types";

/** Snapshots current manual S/R into review history — does not write S/R tables. */
export function buildWeeklyMarketSnapshots(
  rows: WatchlistScannerRow[],
  reviewDate: string,
  weekEnding: string
): WeeklyMarketUpdateRecord[] {
  return rows.map((row) => ({
    id: `${row.watchlistId}-${weekEnding}`,
    reviewDate,
    weekEnding,
    ticker: row.ticker,
    watchlistId: row.watchlistId,
    support1: row.supportResistance.support1,
    support2: row.supportResistance.support2,
    resistance1: row.supportResistance.resistance1,
    resistance2: row.supportResistance.resistance2,
    analystNotes: row.supportResistance.notes,
    recommendedStrategy:
      row.score?.recommendation.recommendedStrategy ?? null,
    totalScore: row.score?.totalScore ?? null,
    action: row.score?.recommendation.actionLabel ?? null,
    decisionLabel: row.score?.decisionLabel ?? null,
  }));
}
