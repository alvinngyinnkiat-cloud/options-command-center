/** Max tickers fetched + persisted concurrently during watchlist sync. */
export const WATCHLIST_TICKER_CONCURRENCY = 5;

/** market_data rows per Supabase upsert batch. */
export const MARKET_DATA_UPSERT_BATCH_SIZE = 100;

export const WATCHLIST_MANUAL_REFRESH_LOG_SOURCE = "watchlist_manual_refresh";
