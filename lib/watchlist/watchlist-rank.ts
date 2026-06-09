import {
  resolveDefaultPriorityRank,
  type WatchlistCategory,
} from "@/lib/watchlist/categories";
import type { WatchlistScannerRow } from "@/lib/watchlist/types";

/** Max sensible rank within a single category (custom tickers). */
const MAX_CATEGORY_RANK = 99;

/**
 * Category-local display rank — never uses global sort_order as visible rank.
 * Canonical default tickers always use seed ranks from categories.ts.
 */
export function resolveCategoryDisplayRank(
  ticker: string,
  category: WatchlistCategory,
  storedPriorityRank: number
): number {
  const canonical = resolveDefaultPriorityRank(ticker, category);
  if (canonical !== 999) return canonical;

  if (
    storedPriorityRank > 0 &&
    storedPriorityRank <= MAX_CATEGORY_RANK
  ) {
    return storedPriorityRank;
  }

  return 0;
}

export function compareWatchlistRank(
  a: Pick<WatchlistScannerRow, "priorityRank" | "sortOrder" | "ticker">,
  b: Pick<WatchlistScannerRow, "priorityRank" | "sortOrder" | "ticker">
): number {
  const rankA = a.priorityRank > 0 ? a.priorityRank : MAX_CATEGORY_RANK + 1;
  const rankB = b.priorityRank > 0 ? b.priorityRank : MAX_CATEGORY_RANK + 1;
  return (
    rankA - rankB ||
    a.sortOrder - b.sortOrder ||
    a.ticker.localeCompare(b.ticker)
  );
}

export function sortRowsByWatchlistRank(
  rows: WatchlistScannerRow[]
): WatchlistScannerRow[] {
  return [...rows].sort(compareWatchlistRank);
}

export function resolveDisplayRank(
  row: Pick<WatchlistScannerRow, "priorityRank">
): number {
  return row.priorityRank > 0 ? row.priorityRank : 0;
}
