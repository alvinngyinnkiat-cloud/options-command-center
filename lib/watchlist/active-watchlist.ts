import { isSupabaseConfigured } from "@/lib/supabase/is-configured";
import { withSupabaseQuery } from "@/lib/supabase/resolve-user";

/** Canonical active watchlist row for health checks and sync. */
export interface ActiveWatchlistItem {
  id: string;
  ticker: string;
  sortOrder: number;
}

/**
 * Active watchlist tickers for the current server access context.
 * Uses the same Supabase client path as getWatchlistScannerData (session or dev service-role).
 */
export async function fetchActiveWatchlistItems(): Promise<ActiveWatchlistItem[]> {
  if (!isSupabaseConfigured()) return [];

  return withSupabaseQuery(
    async ({ userId, supabase }) => {
      const { data, error } = await supabase
        .from("watchlist")
        .select("id, ticker, sort_order")
        .eq("user_id", userId)
        .eq("is_active", true)
        .order("sort_order", { ascending: true });

      if (error) return [];

      return (data ?? []).map((row) => {
        const r = row as { id: string; ticker: string; sort_order: number };
        return {
          id: r.id,
          ticker: r.ticker,
          sortOrder: r.sort_order,
        };
      });
    },
    () => []
  );
}

export async function countActiveWatchlistItems(): Promise<number> {
  const items = await fetchActiveWatchlistItems();
  return items.length;
}
