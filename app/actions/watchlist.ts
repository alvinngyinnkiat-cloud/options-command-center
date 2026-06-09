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
import {
  runWatchlistScannerRefreshJob,
} from "@/lib/watchlist/refresh-watchlist-scanner";
import { getWatchlistScannerData } from "@/lib/supabase/queries/watchlist-scanner";
import { isSupabaseConfigured } from "@/lib/supabase/is-configured";
import { requireUserId, withSupabaseQuery } from "@/lib/supabase/resolve-user";
import { createClient } from "@/lib/supabase/server";
import { WATCHLIST_MANUAL_REFRESH_LOG_SOURCE } from "@/lib/watchlist/sync-concurrency";
import { revalidatePath } from "next/cache";
import { after } from "next/server";
import type { SupportResistance, WatchlistItem } from "@/types/database";

export type WatchlistActionResult =
  | { success: true; rows: WatchlistScannerRow[]; dataSource: "supabase" | "mock" }
  | { success: false; error: string };

async function refreshRows(): Promise<WatchlistScannerRow[]> {
  const data = await getWatchlistScannerData({ persistScores: true });
  return data.rows;
}

async function resolveWatchlistItemForUpdate(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string,
  watchlistId: string,
  ticker: string
): Promise<{ id: string; ticker: string } | null> {
  console.log("[save-sr] lookup by id", { watchlistId, userId });

  const { data: byId, error: byIdError } = await supabase
    .from("watchlist")
    .select("id, ticker")
    .eq("id", watchlistId)
    .eq("user_id", userId)
    .maybeSingle();

  if (byIdError) {
    console.error("[save-sr] lookup by id failed:", byIdError.message);
  }

  if (byId) {
    const row = byId as { id: string; ticker: string };
    console.log("[save-sr] matched by id", { id: row.id, ticker: row.ticker });
    return row;
  }

  const normalizedTicker = normalizeTicker(ticker);
  console.log("[save-sr] lookup by ticker fallback", {
    watchlistId,
    ticker: normalizedTicker,
    userId,
  });

  const { data: byTicker, error: byTickerError } = await supabase
    .from("watchlist")
    .select("id, ticker")
    .eq("user_id", userId)
    .eq("ticker", normalizedTicker)
    .maybeSingle();

  if (byTickerError) {
    console.error("[save-sr] lookup by ticker failed:", byTickerError.message);
  }

  if (byTicker) {
    const row = byTicker as { id: string; ticker: string };
    console.log("[save-sr] matched by ticker", { id: row.id, ticker: row.ticker });
    return row;
  }

  console.warn("[save-sr] no watchlist row matched", {
    watchlistId,
    ticker: normalizedTicker,
    userId,
  });
  return null;
}

export type RefreshWatchlistScannerResult =
  | {
      success: true;
      rows: WatchlistScannerRow[];
      dataSource: "supabase" | "mock";
      tickersProcessed: number;
      tickersFailed: number;
      background?: false;
    }
  | {
      success: true;
      rows: WatchlistScannerRow[];
      dataSource: "supabase" | "mock";
      background: true;
      refreshStartedAt: string;
      message: string;
    }
  | { success: false; error: string };

/** Read-only snapshot for polling while background refresh runs. */
export async function loadWatchlistScannerSnapshotAction(): Promise<
  Pick<RefreshWatchlistScannerResult, "success"> & {
    rows?: WatchlistScannerRow[];
    dataSource?: "supabase" | "mock";
    error?: string;
  }
> {
  try {
    const data = await getWatchlistScannerData({ persistScores: false });
    return {
      success: true,
      rows: data.rows,
      dataSource: data.dataSource,
    };
  } catch (e) {
    return {
      success: false,
      error: e instanceof Error ? e.message : "Failed to load watchlist.",
    };
  }
}

/** Manual refresh — returns immediately; sync runs in background via after(). */
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
    const snapshot = await getWatchlistScannerData({ persistScores: false });
    const startedAt = new Date().toISOString();

    after(async () => {
      try {
        await ensureDefaultWatchlistItems();
        await runWatchlistScannerRefreshJob(userId, startedAt);
      } catch (e) {
        console.error("[watchlist-refresh] Background job failed:", e);
      }
    });

    return {
      success: true,
      background: true,
      refreshStartedAt: startedAt,
      rows: snapshot.rows,
      dataSource: snapshot.dataSource,
      message:
        "Refresh started in background. Market data for all tickers is updating — this page will refresh automatically.",
    };
  } catch (e) {
    return {
      success: false,
      error: e instanceof Error ? e.message : "Watchlist refresh failed.",
    };
  }
}

/** Poll whether a background refresh started at `refreshStartedAt` has finished. */
export async function getWatchlistRefreshStatusAction(refreshStartedAt: string): Promise<{
  complete: boolean;
  status?: "success" | "partial" | "failed";
}> {
  if (!isSupabaseConfigured()) {
    return { complete: true, status: "success" };
  }

  try {
    const userId = await requireUserId();
    const supabase = await createClient();
    const { data } = await supabase
      .from("data_source_logs")
      .select("status, completed_at")
      .eq("user_id", userId)
      .eq("source_name", WATCHLIST_MANUAL_REFRESH_LOG_SOURCE)
      .eq("started_at", refreshStartedAt)
      .maybeSingle();

    const row = data as { status: string; completed_at: string | null } | null;
    if (!row?.completed_at) {
      return { complete: false };
    }

    const status = row.status as "success" | "partial" | "failed";
    return { complete: true, status };
  } catch {
    return { complete: false };
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

  console.log("[save-sr] payload received", {
    watchlistId: input.watchlistId,
    ticker: input.ticker,
    timeframe,
    support1: input.support1,
    support2: input.support2,
    resistance1: input.resistance1,
    resistance2: input.resistance2,
    updateDate: input.updateDate,
  });

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
    const saved = await withSupabaseQuery(
      async ({ userId, supabase }) => {
        const watchlistItem = await resolveWatchlistItemForUpdate(
          supabase,
          userId,
          input.watchlistId,
          input.ticker
        );

        if (!watchlistItem) {
          return { ok: false as const, error: "Watchlist item not found." };
        }

        const resolvedWatchlistId = watchlistItem.id;
        const resolvedTicker = watchlistItem.ticker;

        const { data: existingSr } = await supabase
          .from("support_resistance")
          .select("id, created_at")
          .eq("watchlist_id", resolvedWatchlistId)
          .eq("timeframe", timeframe)
          .maybeSingle();

        const existingRow = existingSr as
          | { id: string; created_at: string }
          | null;
        const now = new Date().toISOString();

        const payload: SupportResistance = {
          id: existingRow?.id ?? crypto.randomUUID(),
          user_id: userId,
          watchlist_id: resolvedWatchlistId,
          ticker: resolvedTicker,
          timeframe,
          support_1: input.support1,
          support_2: input.support2,
          resistance_1: input.resistance1,
          resistance_2: input.resistance2,
          notes: input.notes,
          update_date: input.updateDate,
          created_at: existingRow?.created_at ?? now,
          updated_at: now,
        };

        console.log("[save-sr] upserting", {
          watchlistId: resolvedWatchlistId,
          ticker: resolvedTicker,
          srId: payload.id,
        });

        const { error } = await supabase
          .from("support_resistance")
          .upsert(payload as never, { onConflict: "watchlist_id,timeframe" });

        if (error) {
          console.error("[save-sr] upsert failed:", error.message);
          return { ok: false as const, error: error.message };
        }

        console.log("[save-sr] upsert success", {
          watchlistId: resolvedWatchlistId,
          srId: payload.id,
        });
        return { ok: true as const };
      },
      () => ({ ok: false as const, error: "Authentication required." })
    );

    if (!saved.ok) {
      return { success: false, error: saved.error };
    }

    revalidatePath("/watchlist");
    const rows = await refreshRows();
    return { success: true, rows, dataSource: "supabase" };
  } catch (e) {
    console.error("[save-sr] unexpected error:", e);
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
