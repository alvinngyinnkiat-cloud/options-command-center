"use server";

import { addWatchlistTicker } from "@/app/actions/watchlist";
import type { AutoWatchlistActionResult } from "@/lib/auto-watchlist/types";
import {
  getAutoWatchlistPageData,
  refreshAutoWatchlist,
} from "@/lib/supabase/queries/auto-watchlist";
import { requireUserId } from "@/lib/supabase/resolve-user";
import { revalidatePath } from "next/cache";

export async function refreshAutoWatchlistAction(): Promise<AutoWatchlistActionResult> {
  try {
    const userId = await requireUserId();
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
