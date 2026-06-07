import type { WeeklyMarketUpdateRecord } from "./types";

/** Latest analyst note per watchlist from review history. */
export function buildWeekendNotesMap(
  history: WeeklyMarketUpdateRecord[]
): Map<string, string | null> {
  const map = new Map<string, string | null>();
  for (const record of history) {
    if (!map.has(record.watchlistId)) {
      map.set(record.watchlistId, record.analystNotes);
    }
  }
  return map;
}

export function buildRankMap(
  rankings: { watchlistId: string; rank: number }[]
): Map<string, number> {
  return new Map(rankings.map((r) => [r.watchlistId, r.rank]));
}
