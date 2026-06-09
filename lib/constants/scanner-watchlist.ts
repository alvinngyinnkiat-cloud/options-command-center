/**
 * Default watchlist universe grouped by scanner category.
 * @see lib/watchlist/categories.ts
 */

import { getAllDefaultWatchlistTickers } from "@/lib/watchlist/categories";

export { WATCHLIST_CATEGORIES, WATCHLIST_CATEGORY_DEFAULTS } from "@/lib/watchlist/categories";
export type { WatchlistCategory } from "@/lib/watchlist/categories";

/** Flat list of all 25 seeded default manual watchlist tickers. */
export const SCANNER_DEFAULT_TICKERS = getAllDefaultWatchlistTickers() as readonly string[];

export type ScannerDefaultTicker = (typeof SCANNER_DEFAULT_TICKERS)[number];
