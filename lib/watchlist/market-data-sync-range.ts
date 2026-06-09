import { subDays, format } from "date-fns";
import { lastCompletedTradingDate } from "@/lib/market-calendar/nyse-calendar";

/** Lookback for indicator history (SMA200 requires 200+ completed bars). */
export const WATCHLIST_HISTORY_DAYS = 400;

export function getWatchlistHistoryRange(now: Date = new Date()): {
  completedCandleDate: string;
  from: string;
  to: string;
} {
  const completedCandleDate = lastCompletedTradingDate(now);
  const from = format(
    subDays(new Date(`${completedCandleDate}T12:00:00Z`), WATCHLIST_HISTORY_DAYS),
    "yyyy-MM-dd"
  );

  return {
    completedCandleDate,
    from,
    to: completedCandleDate,
  };
}
