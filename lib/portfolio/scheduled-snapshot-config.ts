/** Production daily portfolio snapshot — 23:59 in Singapore. */
export const PORTFOLIO_SNAPSHOT_TIMEZONE = "Asia/Singapore";

/** Local schedule intent: 11:59 PM SGT daily. */
export const PORTFOLIO_SNAPSHOT_CRON_LOCAL = "59 23 * * *";

/** Vercel cron is UTC-only: 23:59 SGT = 15:59 UTC. */
export const PORTFOLIO_SNAPSHOT_CRON_UTC = "59 15 * * *";

export const PORTFOLIO_SNAPSHOT_LOCAL_HOUR = 23;
export const PORTFOLIO_SNAPSHOT_LOCAL_MINUTE = 59;

export const PORTFOLIO_SNAPSHOT_CRON_PATH = "/api/cron/portfolio-daily-snapshot";

export const PORTFOLIO_SNAPSHOT_LOG_SOURCE = "portfolio_daily_snapshot_cron";
