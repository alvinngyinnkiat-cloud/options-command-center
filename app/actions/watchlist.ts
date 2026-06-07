"use server";

import {
  buildMockScannerRow,
  buildMockScannerRows,
} from "@/lib/mock/watchlist-scanner";
import {
  isValidTicker,
  normalizeTicker,
  sortScannerRows,
} from "@/lib/watchlist/calculations";
import { attachScoresToRows } from "@/lib/watchlist/scoring/map-row";
import type {
  SupportResistanceInput,
  WatchlistScannerRow,
} from "@/lib/watchlist/types";
import type { WatchlistCategory } from "@/lib/watchlist/categories";
import { getWatchlistScannerData } from "@/lib/supabase/queries/watchlist-scanner";
import { isSupabaseConfigured } from "@/lib/supabase/is-configured";
import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import type { SupportResistance, WatchlistItem } from "@/types/database";

export type WatchlistActionResult =
  | { success: true; rows: WatchlistScannerRow[]; dataSource: "supabase" | "mock" }
  | { success: false; error: string };

async function refreshRows(): Promise<WatchlistScannerRow[]> {
  const data = await getWatchlistScannerData();
  return data.rows;
}

export async function addWatchlistTicker(
  ticker: string,
  category: WatchlistCategory = "Pullbacks"
): Promise<WatchlistActionResult> {
  const normalized = normalizeTicker(ticker);

  if (!isValidTicker(normalized)) {
    return { success: false, error: "Invalid ticker symbol." };
  }

  if (!isSupabaseConfigured()) {
    const current = buildMockScannerRows();
    if (current.some((r) => r.ticker === normalized)) {
      return { success: false, error: `${normalized} is already on the watchlist.` };
    }
    const next = attachScoresToRows(
      sortScannerRows([
        ...current,
        buildMockScannerRow(normalized, current.length, undefined, category),
      ])
    );
    return { success: true, rows: next, dataSource: "mock" };
  }

  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      const current = buildMockScannerRows();
      if (current.some((r) => r.ticker === normalized)) {
        return { success: false, error: `${normalized} is already on the watchlist.` };
      }
      return {
        success: true,
        rows: attachScoresToRows(
          sortScannerRows([
            ...current,
            buildMockScannerRow(normalized, current.length, undefined, category),
          ])
        ),
        dataSource: "mock",
      };
    }

    const { data: existing } = await supabase
      .from("watchlist")
      .select("id")
      .eq("user_id", user.id)
      .eq("ticker", normalized)
      .maybeSingle();

    if (existing) {
      return { success: false, error: `${normalized} is already on the watchlist.` };
    }

    const { data: maxOrder } = await supabase
      .from("watchlist")
      .select("sort_order")
      .eq("user_id", user.id)
      .order("sort_order", { ascending: false })
      .limit(1)
      .maybeSingle();

    const sortOrder = maxOrder ? (maxOrder as { sort_order: number }).sort_order + 1 : 0;

    const insertPayload: WatchlistItem = {
      id: crypto.randomUUID(),
      user_id: user.id,
      ticker: normalized,
      display_name: null,
      sort_order: sortOrder,
      is_active: true,
      watchlist_category: category,
      notes: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    const { error } = await supabase
      .from("watchlist")
      .insert(insertPayload as never);

    if (error) {
      return { success: false, error: error.message };
    }

    revalidatePath("/watchlist");
    const rows = await refreshRows();
    return { success: true, rows, dataSource: "supabase" };
  } catch (e) {
    return {
      success: false,
      error: e instanceof Error ? e.message : "Failed to add ticker.",
    };
  }
}

export async function removeWatchlistTicker(
  watchlistId: string
): Promise<WatchlistActionResult> {
  if (!isSupabaseConfigured()) {
    const next = attachScoresToRows(
      buildMockScannerRows().filter((r) => r.watchlistId !== watchlistId)
    );
    return { success: true, rows: next, dataSource: "mock" };
  }

  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      const next = attachScoresToRows(
        buildMockScannerRows().filter((r) => r.watchlistId !== watchlistId)
      );
      return { success: true, rows: next, dataSource: "mock" };
    }

    const { error } = await supabase
      .from("watchlist")
      .delete()
      .eq("id", watchlistId)
      .eq("user_id", user.id);

    if (error) {
      return { success: false, error: error.message };
    }

    revalidatePath("/watchlist");
    const rows = await refreshRows();
    return { success: true, rows, dataSource: "supabase" };
  } catch (e) {
    return {
      success: false,
      error: e instanceof Error ? e.message : "Failed to remove ticker.",
    };
  }
}

/**
 * Saves MANUAL support/resistance only — never auto-generated.
 * See PROJECT_RULES.md.
 */
export async function saveSupportResistance(
  input: SupportResistanceInput
): Promise<WatchlistActionResult> {
  const timeframe = input.timeframe ?? "daily";

  if (!isSupabaseConfigured()) {
    const current = buildMockScannerRows();
    const next = attachScoresToRows(
      current.map((row) => {
        if (row.watchlistId !== input.watchlistId) return row;
        return {
          ...row,
          supportResistance: {
            ...row.supportResistance,
            support1: input.support1,
            support2: input.support2,
            resistance1: input.resistance1,
            resistance2: input.resistance2,
            notes: input.notes,
            updateDate: input.updateDate,
            timeframe,
          },
        };
      })
    );
    return { success: true, rows: next, dataSource: "mock" };
  }

  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return { success: false, error: "Not authenticated." };
    }

    const { data: watchlistItem } = await supabase
      .from("watchlist")
      .select("id")
      .eq("id", input.watchlistId)
      .eq("user_id", user.id)
      .maybeSingle();

    if (!watchlistItem) {
      return { success: false, error: "Watchlist item not found." };
    }

    const { data: existingSr } = await supabase
      .from("support_resistance")
      .select("id")
      .eq("watchlist_id", input.watchlistId)
      .eq("timeframe", timeframe)
      .maybeSingle();

    const existingId = existingSr
      ? (existingSr as { id: string }).id
      : crypto.randomUUID();

    const payload: SupportResistance = {
      id: existingId,
      user_id: user.id,
      watchlist_id: input.watchlistId,
      ticker: input.ticker,
      timeframe,
      support_1: input.support1,
      support_2: input.support2,
      resistance_1: input.resistance1,
      resistance_2: input.resistance2,
      notes: input.notes,
      update_date: input.updateDate,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    const { error } = await supabase
      .from("support_resistance")
      .upsert(payload as never, { onConflict: "watchlist_id,timeframe" });

    if (error) {
      return { success: false, error: error.message };
    }

    revalidatePath("/watchlist");
    const rows = await refreshRows();
    return { success: true, rows, dataSource: "supabase" };
  } catch (e) {
    return {
      success: false,
      error: e instanceof Error ? e.message : "Failed to save support/resistance.",
    };
  }
}
