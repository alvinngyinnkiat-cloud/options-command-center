/** Production watchlist auto-refresh — 06:00 daily in Singapore. */
export const WATCHLIST_REFRESH_TIMEZONE = "Asia/Singapore";

/** Local schedule intent (RRULE: FREQ=DAILY;BYHOUR=6;BYMINUTE=0). */
export const WATCHLIST_REFRESH_CRON_LOCAL = "0 6 * * *";

/** Vercel cron is UTC-only: 06:00 SGT = 22:00 UTC (previous calendar day). */
export const WATCHLIST_REFRESH_CRON_UTC = "0 22 * * *";

export const WATCHLIST_REFRESH_LOCAL_HOUR = 6;
export const WATCHLIST_REFRESH_LOCAL_MINUTE = 0;

export const WATCHLIST_SCHEDULED_LOG_SOURCE = "watchlist_scheduled_refresh";

export {
  DAILY_AUTO_REFRESH_LABEL,
  formatNextScheduledRefresh,
  formatSingaporeTimestamp,
  getNextScheduledRefreshAt,
} from "@/lib/time/singapore-time";

export function describeDataSourceSummary(input: {
  fmpCount: number;
  yahooCount: number;
}): string {
  const { fmpCount, yahooCount } = input;
  if (fmpCount > 0 && yahooCount > 0) {
    return "FMP (Yahoo fallback)";
  }
  if (fmpCount > 0) return "FMP";
  if (yahooCount > 0) return "Yahoo";
  return "—";
}
