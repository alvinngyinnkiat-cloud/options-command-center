import {
  buildDefaultWatchlistSeeds,
  resolveDefaultPriorityRank,
  WATCHLIST_CATEGORIES,
  type WatchlistCategory,
} from "@/lib/watchlist/categories";
import { normalizeTicker } from "@/lib/watchlist/calculations";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";

/**
 * Ensures priority_rank and sort_order are unique within each category.
 * Canonical default tickers always receive seed ranks from categories.ts.
 */
export async function normalizeWatchlistRanksForUser(
  supabase: SupabaseClient<Database>,
  userId: string
): Promise<number> {
  const seeds = buildDefaultWatchlistSeeds();
  const seedByTicker = new Map(
    seeds.map((s) => [normalizeTicker(s.ticker), s])
  );

  const { data, error } = await supabase
    .from("watchlist")
    .select("id, ticker, watchlist_category, priority_rank, sort_order, is_active")
    .eq("user_id", userId);

  if (error || !data?.length) return 0;

  const now = new Date().toISOString();
  let updated = 0;

  type Row = {
    id: string;
    ticker: string;
    watchlist_category: string;
    priority_rank: number;
    sort_order: number;
    is_active: boolean;
  };

  const rows = data as Row[];

  for (const row of rows) {
    const ticker = normalizeTicker(row.ticker);
    const seed = seedByTicker.get(ticker);
    if (!seed) continue;

    const patch: Record<string, unknown> = {};
    if (row.priority_rank !== seed.priorityRank) {
      patch.priority_rank = seed.priorityRank;
    }
    if (row.sort_order !== seed.sortOrder) {
      patch.sort_order = seed.sortOrder;
    }

    if (Object.keys(patch).length > 0) {
      patch.updated_at = now;
      const { error: updateError } = await supabase
        .from("watchlist")
        .update(patch as never)
        .eq("id", row.id)
        .eq("user_id", userId);

      if (!updateError) updated++;
    }
  }

  const activeByCategory = new Map<WatchlistCategory, Row[]>();
  for (const category of WATCHLIST_CATEGORIES) {
    activeByCategory.set(category, []);
  }

  for (const row of rows) {
    if (!row.is_active) continue;
    const category = row.watchlist_category as WatchlistCategory;
    if (!activeByCategory.has(category)) continue;
    activeByCategory.get(category)!.push(row);
  }

  for (const [category, categoryRows] of activeByCategory) {
    const usedRanks = new Set<number>();
    const reserved = new Set<number>();

    for (const row of categoryRows) {
      const seed = seedByTicker.get(normalizeTicker(row.ticker));
      if (seed) {
        reserved.add(seed.priorityRank);
        usedRanks.add(seed.priorityRank);
      }
    }

    const customRows = categoryRows
      .filter((row) => !seedByTicker.has(normalizeTicker(row.ticker)))
      .sort(
        (a, b) =>
          a.priority_rank - b.priority_rank ||
          a.sort_order - b.sort_order ||
          a.ticker.localeCompare(b.ticker)
      );

    for (const row of customRows) {
      let rank = row.priority_rank;
      const defaultRank = resolveDefaultPriorityRank(row.ticker, category);
      if (defaultRank !== 999) {
        rank = defaultRank;
      } else if (rank <= 0 || usedRanks.has(rank)) {
        rank = 1;
        while (usedRanks.has(rank)) rank++;
      }

      usedRanks.add(rank);

      if (rank !== row.priority_rank) {
        const { error: updateError } = await supabase
          .from("watchlist")
          .update({ priority_rank: rank, updated_at: now } as never)
          .eq("id", row.id)
          .eq("user_id", userId);

        if (!updateError) updated++;
      }
    }
  }

  return updated;
}
