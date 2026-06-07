/**
 * Default watchlist tickers — see PROJECT_RULES.md §9.
 * Used for seeding new users in Phase 2+.
 */

export const DEFAULT_WATCHLIST_TICKERS = [
  "XSP",
  "SPY",
  "QQQ",
  "IWM",
  "GLD",
  "JPM",
  "CAT",
  "WMT",
  "UNH",
  "XOM",
  "HD",
  "AAPL",
  "MSFT",
  "NVDA",
  "AVGO",
  "AMZN",
  "META",
  "GOOG",
] as const;

export type DefaultWatchlistTicker = (typeof DEFAULT_WATCHLIST_TICKERS)[number];
