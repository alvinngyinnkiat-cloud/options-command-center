import {
  buildDefaultWatchlistSeeds,
  resolveDefaultPriorityRank,
  resolveWatchlistCategory,
  normalizeWatchlistCategory,
} from "@/lib/watchlist/categories";
import { normalizeWatchlistCategoriesForUser } from "@/lib/watchlist/normalize-watchlist-categories";
import { normalizeWatchlistRanksForUser } from "@/lib/watchlist/normalize-watchlist-ranks";
import { normalizeTicker } from "@/lib/watchlist/calculations";
import { isSupabaseConfigured } from "@/lib/supabase/is-configured";
import {
  getServerSupabaseClient,
  resolveSupabaseServerAccess,
} from "@/lib/supabase/server-write";
import { withSupabaseQuery } from "@/lib/supabase/resolve-user";
import type { WatchlistItem } from "@/types/database";

export interface EnsureDefaultWatchlistResult {
  added: string[];
  reactivated: string[];
  updated: string[];
  skipped: string[];
}

/**
 * Ensures the canonical default trading universe exists for the user.
 * Never touches support_resistance — manual S/R is preserved.
 */
export async function ensureDefaultWatchlistItems(): Promise<EnsureDefaultWatchlistResult> {
  const result: EnsureDefaultWatchlistResult = {
    added: [],
    reactivated: [],
    updated: [],
    skipped: [],
  };

  if (!isSupabaseConfigured()) return result;

  const seeds = buildDefaultWatchlistSeeds();
  const seedByTicker = new Map(
    seeds.map((s) => [normalizeTicker(s.ticker), s])
  );

  return withSupabaseQuery(
    async ({ userId, supabase }) => {
      await normalizeWatchlistCategoriesForUser(supabase, userId);

      const { data: existingRows, error } = await supabase
        .from("watchlist")
        .select("id, ticker, is_active, sort_order, watchlist_category, priority_rank")
        .eq("user_id", userId);

      if (error) return result;

      const byTicker = new Map<
        string,
        {
          id: string;
          is_active: boolean;
          watchlist_category: string;
          priority_rank: number;
          sort_order: number;
        }
      >();
      for (const row of existingRows ?? []) {
        const r = row as {
          id: string;
          ticker: string;
          is_active: boolean;
          watchlist_category: string;
          priority_rank: number;
          sort_order: number;
        };
        byTicker.set(normalizeTicker(r.ticker), {
          id: r.id,
          is_active: r.is_active,
          watchlist_category: r.watchlist_category,
          priority_rank: r.priority_rank ?? 0,
          sort_order: r.sort_order ?? 0,
        });
      }

      let nextSortOrder =
        (existingRows ?? []).reduce((max, row) => {
          const order = Number((row as { sort_order?: number }).sort_order ?? 0);
          return Math.max(max, order);
        }, -1) + 1;

      const now = new Date().toISOString();

      for (const seed of seeds) {
        const ticker = normalizeTicker(seed.ticker);
        const existing = byTicker.get(ticker);

        if (!existing) {
          const insertPayload: WatchlistItem = {
            id: crypto.randomUUID(),
            user_id: userId,
            ticker,
            display_name: null,
            sort_order: seed.sortOrder,
            priority_rank: seed.priorityRank,
            is_active: true,
            watchlist_category: seed.category,
            notes: null,
            created_at: now,
            updated_at: now,
          };

          const { error: insertError } = await supabase
            .from("watchlist")
            .insert(insertPayload as never);

          if (!insertError) {
            result.added.push(ticker);
            byTicker.set(ticker, {
              id: insertPayload.id,
              is_active: true,
              watchlist_category: seed.category,
              priority_rank: seed.priorityRank,
              sort_order: seed.sortOrder,
            });
          }
          continue;
        }

        const needsCategorySync = existing.watchlist_category !== seed.category;
        const needsRankSync =
          existing.priority_rank !== seed.priorityRank ||
          existing.sort_order !== seed.sortOrder;
        const patch: Record<string, unknown> = { updated_at: now };

        if (!existing.is_active) {
          patch.is_active = true;
        }
        if (needsCategorySync) {
          patch.watchlist_category = seed.category;
        }
        if (needsCategorySync || needsRankSync) {
          patch.priority_rank = seed.priorityRank;
          patch.sort_order = seed.sortOrder;
        }

        if (Object.keys(patch).length > 1) {
          const { error: updateError } = await supabase
            .from("watchlist")
            .update(patch as never)
            .eq("id", existing.id);

          if (!updateError) {
            if (!existing.is_active) result.reactivated.push(ticker);
            else if (needsCategorySync || needsRankSync) result.updated.push(ticker);
          }
          continue;
        }

        result.skipped.push(ticker);
      }

      // Backfill priority_rank and legacy categories for custom tickers
      for (const row of existingRows ?? []) {
        const r = row as {
          id: string;
          ticker: string;
          priority_rank?: number;
          watchlist_category: string;
        };
        const canonical = normalizeWatchlistCategory(r.watchlist_category);
        const category = resolveWatchlistCategory(r.ticker, canonical ?? r.watchlist_category);
        const rank = resolveDefaultPriorityRank(r.ticker, category);
        const patch: Record<string, unknown> = { updated_at: now };

        if (canonical && canonical !== r.watchlist_category) {
          patch.watchlist_category = canonical;
        }
        if ((r.priority_rank ?? 0) <= 0 && rank !== 999) {
          patch.priority_rank = rank;
        }

        if (Object.keys(patch).length > 1) {
          await supabase
            .from("watchlist")
            .update(patch as never)
            .eq("id", r.id);
        }
      }

      await normalizeWatchlistRanksForUser(supabase, userId);

      return result;
    },
    () => result
  );
}

/** Dev/service-role safe client for watchlist sync when no client is injected. */
export async function resolveWatchlistSyncClient(
  supabase?: import("@supabase/supabase-js").SupabaseClient<
    import("@/types/database").Database
  >
) {
  if (supabase) return supabase;
  const access = await resolveSupabaseServerAccess();
  if (access) return getServerSupabaseClient(access);
  const { createClient } = await import("@/lib/supabase/server");
  return createClient();
}
