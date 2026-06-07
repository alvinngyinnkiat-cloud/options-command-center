import { getTickerWeekendReviewFlags } from "@/lib/watchlist/analysis-card";
import type { WatchlistScannerRow } from "@/lib/watchlist/types";
import type {
  TickerReviewStatusKey,
  TickerReviewStatusLabel,
  TickerReviewStatusRow,
} from "./types";
import type { WeekendReviewStatus } from "./types";

function toLabel(key: TickerReviewStatusKey): TickerReviewStatusLabel {
  switch (key) {
    case "updated_this_weekend":
      return "Updated This Weekend";
    case "updated_last_week":
      return "Updated Last Week";
    case "needs_review":
      return "Needs Review";
  }
}

export function buildTickerReviewStatusRows(
  rows: WatchlistScannerRow[],
  reviewStatus: WeekendReviewStatus
): TickerReviewStatusRow[] {
  return rows.map((row) => {
    const flags = getTickerWeekendReviewFlags(row, reviewStatus);
    const statusKey: TickerReviewStatusKey = flags.updatedThisWeekend
      ? "updated_this_weekend"
      : flags.updatedLastWeek
        ? "updated_last_week"
        : "needs_review";

    return {
      watchlistId: row.watchlistId,
      ticker: row.ticker,
      lastReviewDate: row.supportResistance.updateDate,
      support1: row.supportResistance.support1,
      support2: row.supportResistance.support2,
      resistance1: row.supportResistance.resistance1,
      resistance2: row.supportResistance.resistance2,
      analystNotes: row.supportResistance.notes,
      reviewStatus: toLabel(statusKey),
      statusKey,
    };
  });
}
