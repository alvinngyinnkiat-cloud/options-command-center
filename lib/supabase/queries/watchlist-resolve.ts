import { resolveDefaultPriorityRank, resolveWatchlistCategory } from "@/lib/watchlist/categories";
import { normalizeTicker } from "@/lib/watchlist/calculations";
import {
  isMockWatchlistId,
  mockWatchlistIdForTicker,
} from "@/lib/watchlist/resolve-id";
import { isSupabaseConfigured } from "@/lib/supabase/is-configured";
import {
  isValidSupabaseUserId,
  withSupabaseQuery,
} from "@/lib/supabase/resolve-user";
import type { WatchlistItem } from "@/types/database";

export { isMockWatchlistId, mockWatchlistIdForTicker };

/**
 * Resolves a real watchlist UUID for options_trades.watchlist_id.
 * Creates a watchlist row for the ticker when missing (trade entry auto-links).
 */
export async function ensureWatchlistIdForTicker(
  userId: string,
  ticker: string
): Promise<string> {
  const normalized = normalizeTicker(ticker);
  if (!normalized) {
    throw new Error("Ticker is required to link trade to watchlist.");
  }

  if (!isSupabaseConfigured() || !isValidSupabaseUserId(userId)) {
    return mockWatchlistIdForTicker(normalized);
  }

  return withSupabaseQuery(
    async ({ userId: effectiveUserId, supabase }) => {
      const { data: existing, error: lookupError } = await supabase
        .from("watchlist")
        .select("id")
        .eq("user_id", effectiveUserId)
        .eq("ticker", normalized)
        .maybeSingle();

      if (lookupError) throw new Error(lookupError.message);
      if (existing) return (existing as { id: string }).id;

      const { data: maxOrder } = await supabase
        .from("watchlist")
        .select("sort_order")
        .eq("user_id", effectiveUserId)
        .order("sort_order", { ascending: false })
        .limit(1)
        .maybeSingle();

      const sortOrder = maxOrder
        ? Number((maxOrder as { sort_order: number }).sort_order) + 1
        : 0;
      const now = new Date().toISOString();

      const category = resolveWatchlistCategory(normalized);
      const insertPayload: WatchlistItem = {
        id: crypto.randomUUID(),
        user_id: effectiveUserId,
        ticker: normalized,
        display_name: null,
        sort_order: sortOrder,
        priority_rank: resolveDefaultPriorityRank(normalized, category),
        is_active: true,
        watchlist_category: category,
        notes: null,
        created_at: now,
        updated_at: now,
      };

      const { data: inserted, error: insertError } = await supabase
        .from("watchlist")
        .insert(insertPayload as never)
        .select("id")
        .single();

      if (insertError) throw new Error(insertError.message);
      return (inserted as { id: string }).id;
    },
    () => mockWatchlistIdForTicker(normalized)
  );
}
