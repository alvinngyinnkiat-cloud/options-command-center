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
import {
  resolveDefaultPriorityRank,
  resolveWatchlistCategory,
  type WatchlistCategory,
} from "@/lib/watchlist/categories";
import { coerceWatchlistCategory } from "@/lib/watchlist/normalize-watchlist-categories";
import { ensureDefaultWatchlistItems } from "@/lib/watchlist/ensure-default-watchlist";
import { refreshWatchlistScannerForUser } from "@/lib/watchlist/refresh-watchlist-scanner";
import { getWatchlistScannerData } from "@/lib/supabase/queries/watchlist-scanner";
import { isSupabaseConfigured } from "@/lib/supabase/is-configured";
import { requireUserId } from "@/lib/supabase/resolve-user";
import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import type { SupportResistance, WatchlistItem } from "@/types/database";

export type WatchlistActionResult =
  | { success: true; rows: WatchlistScannerRow[]; dataSource: "supabase" | "mock" }
  | { success: false; error: string };

async function refreshRows(): Promise<WatchlistScannerRow[]> {
  const data = await getWatchlistScannerData({ persistScores: true });
  return data.rows;
}

export type RefreshWatchlistScannerResult =
  | {
      success: true;
      rows: WatchlistScannerRow[];
      dataSource: "supabase" | "mock";
      tickersProcessed: number;
      tickersFailed: number;
    }
  | { success: false; error: string };

/** Manual refresh — syncs market data, indicators, and scores from Yahoo/FMP. */
export async function refreshWatchlistScannerAction(): Promise<RefreshWatchlistScannerResult> {
  try {
    if (!isSupabaseConfigured()) {
      const data = await getWatchlistScannerData({ persistScores: false });
      return {
        success: true,
        rows: data.rows,
        dataSource: data.dataSource,
        tickersProcessed: data.rows.length,
        tickersFailed: 0,
      };
    }

    const userId = await requireUserId();
    await ensureDefaultWatchlistItems();
    const { sync, scanner } = await refreshWatchlistScannerForUser(userId);
    revalidatePath("/watchlist");
    revalidatePath("/data-health");

    return {
      success: true,
      rows: scanner.rows,
      dataSource: scanner.dataSource,
      tickersProcessed: sync.tickersProcessed,
      tickersFailed: sync.tickersFailed,
    };
  } catch (e) {
    return {
      success: false,
      error: e instanceof Error ? e.message : "Watchlist refresh failed.",
    };
  }
}

export async function addWatchlistTicker(
  ticker: string,
  category: WatchlistCategory | string = "PULLBACK"
): Promise<WatchlistActionResult> {
  const normalized = normalizeTicker(ticker);
  const categoryCode = coerceWatchlistCategory(category);

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
        buildMockScannerRow(normalized, current.length, undefined, categoryCode),
      ])
    );
    return { success: true, rows: next, dataSource: "mock" };
  }

  try {
    const userId = await requireUserId();
    const supabase = await createClient();

    const { data: existing } = await supabase
      .from("watchlist")
      .select("id")
      .eq("user_id", userId)
      .eq("ticker", normalized)
      .maybeSingle();

    if (existing) {
      return { success: false, error: `${normalized} is already on the watchlist.` };
    }

    const { data: maxOrder } = await supabase
      .from("watchlist")
      .select("sort_order")
      .eq("user_id", userId)
      .order("sort_order", { ascending: false })
      .limit(1)
      .maybeSingle();

    const sortOrder = maxOrder ? (maxOrder as { sort_order: number }).sort_order + 1 : 0;
    const priorityRank = resolveDefaultPriorityRank(normalized, categoryCode);

    const insertPayload: WatchlistItem = {
      id: crypto.randomUUID(),
      user_id: userId,
      ticker: normalized,
      display_name: null,
      sort_order: sortOrder,
      priority_rank: priorityRank === 999 ? sortOrder + 1 : priorityRank,
      is_active: true,
      watchlist_category: categoryCode,
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
    const userId = await requireUserId();
    const supabase = await createClient();

    const { error } = await supabase
      .from("watchlist")
      .delete()
      .eq("id", watchlistId)
      .eq("user_id", userId);

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
    const userId = await requireUserId();
    const supabase = await createClient();

    const { data: watchlistItem } = await supabase
      .from("watchlist")
      .select("id")
      .eq("id", input.watchlistId)
      .eq("user_id", userId)
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
      user_id: userId,
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

export async function updateWatchlistItem(input: {
  watchlistId: string;
  category?: WatchlistCategory;
  priorityRank?: number;
  notes?: string | null;
  isActive?: boolean;
}): Promise<WatchlistActionResult> {
  if (!isSupabaseConfigured()) {
    const current = buildMockScannerRows();
    const next = attachScoresToRows(
      current.map((row) => {
        if (row.watchlistId !== input.watchlistId) return row;
        return {
          ...row,
          category: input.category ?? row.category,
          priorityRank: input.priorityRank ?? row.priorityRank,
          notes: input.notes !== undefined ? input.notes : row.notes,
          isActive: input.isActive ?? row.isActive,
        };
      })
    );
    return { success: true, rows: next, dataSource: "mock" };
  }

  try {
    const userId = await requireUserId();
    const supabase = await createClient();

    const patch: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    };
    if (input.category != null) {
      patch.watchlist_category = coerceWatchlistCategory(input.category);
    }
    if (input.priorityRank != null) patch.priority_rank = input.priorityRank;
    if (input.notes !== undefined) patch.notes = input.notes;
    if (input.isActive != null) patch.is_active = input.isActive;

    const { error } = await supabase
      .from("watchlist")
      .update(patch as never)
      .eq("id", input.watchlistId)
      .eq("user_id", userId);

    if (error) {
      return { success: false, error: error.message };
    }

    revalidatePath("/watchlist");
    const rows = await refreshRows();
    return { success: true, rows, dataSource: "supabase" };
  } catch (e) {
    return {
      success: false,
      error: e instanceof Error ? e.message : "Failed to update watchlist item.",
    };
  }
}
