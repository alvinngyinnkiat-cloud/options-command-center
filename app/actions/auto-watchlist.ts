"use server";

import { addWatchlistTicker } from "@/app/actions/watchlist";
import type { AutoWatchlistActionResult } from "@/lib/auto-watchlist/types";
import {
  getAutoWatchlistPageData,
  refreshAutoWatchlist,
} from "@/lib/supabase/queries/auto-watchlist";
import { isSupabaseConfigured } from "@/lib/supabase/is-configured";
import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

async function resolveUserId(): Promise<string | undefined> {
  if (!isSupabaseConfigured()) return undefined;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user?.id;
}

export async function refreshAutoWatchlistAction(): Promise<AutoWatchlistActionResult> {
  try {
    const userId = await resolveUserId();
    const data = await refreshAutoWatchlist(userId);
    revalidatePath("/auto-watchlist");
    return { success: true, data };
  } catch (e) {
    return {
      success: false,
      error: e instanceof Error ? e.message : "Failed to refresh auto watchlist.",
    };
  }
}

export async function addToManualWatchlistAction(
  ticker: string
): Promise<AutoWatchlistActionResult> {
  const addResult = await addWatchlistTicker(ticker, "Pullbacks");
  if (!addResult.success) {
    return { success: false, error: addResult.error };
  }

  const data = await getAutoWatchlistPageData();
  revalidatePath("/watchlist");
  revalidatePath("/auto-watchlist");
  return { success: true, data };
}
