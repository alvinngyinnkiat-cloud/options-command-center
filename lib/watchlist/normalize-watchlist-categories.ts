import {
  normalizeWatchlistCategory,
  type WatchlistCategory,
} from "@/lib/watchlist/categories";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";

/**
 * Runtime normalization for legacy watchlist_category values.
 * Called on startup before seeding so app code always reads canonical codes.
 */
export async function normalizeWatchlistCategoriesForUser(
  supabase: SupabaseClient<Database>,
  userId: string
): Promise<number> {
  const { data, error } = await supabase
    .from("watchlist")
    .select("id, watchlist_category")
    .eq("user_id", userId);

  if (error || !data?.length) return 0;

  const now = new Date().toISOString();
  let updated = 0;

  for (const row of data) {
    const r = row as { id: string; watchlist_category: string };
    const canonical = normalizeWatchlistCategory(r.watchlist_category);
    if (!canonical || canonical === r.watchlist_category) continue;

    const { error: updateError } = await supabase
      .from("watchlist")
      .update({
        watchlist_category: canonical,
        updated_at: now,
      } as never)
      .eq("id", r.id)
      .eq("user_id", userId);

    if (!updateError) updated++;
  }

  return updated;
}

export function coerceWatchlistCategory(
  value: WatchlistCategory | string
): WatchlistCategory {
  const normalized = normalizeWatchlistCategory(value);
  if (normalized) return normalized;
  return "PULLBACK";
}
