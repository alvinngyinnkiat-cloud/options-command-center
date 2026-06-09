/**
 * Default watchlist tickers — see PROJECT_RULES.md §9.
 * Flat list mirrors lib/watchlist/categories.ts trading universe.
 */

import { getAllDefaultWatchlistTickers } from "@/lib/watchlist/categories";

export const DEFAULT_WATCHLIST_TICKERS = getAllDefaultWatchlistTickers() as readonly string[];

export type DefaultWatchlistTicker = (typeof DEFAULT_WATCHLIST_TICKERS)[number];
