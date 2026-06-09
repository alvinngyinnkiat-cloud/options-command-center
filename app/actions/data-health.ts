"use server";

import { syncDividendsFromApi } from "@/app/actions/dividend-records";
import { getDataHealthPageData } from "@/lib/data-health/run-health-check";
import type { DataHealthPageData } from "@/lib/data-health/types";
import { refreshWatchlistScannerForUser } from "@/lib/watchlist/refresh-watchlist-scanner";
import { ensureDefaultWatchlistItems } from "@/lib/watchlist/ensure-default-watchlist";
import { appendDataSourceLog } from "@/lib/supabase/queries/data-source-logs";
import { isSupabaseConfigured } from "@/lib/supabase/is-configured";
import { requireUserId } from "@/lib/supabase/resolve-user";
import { revalidatePath } from "next/cache";

import type { TickerSyncDiagnostic } from "@/lib/watchlist/sync-watchlist-data";

export type DataHealthActionResult =
  | { success: true; data: DataHealthPageData }
  | { success: false; error: string };

async function finish(
  userId: string,
  marketDataTickerDiagnostics: TickerSyncDiagnostic[] = []
): Promise<DataHealthPageData> {
  revalidatePath("/data-health");
  revalidatePath("/");
  return getDataHealthPageData(userId, marketDataTickerDiagnostics);
}

async function logRefresh(
  userId: string,
  sourceName: string,
  startedAt: string,
  result: {
    status: "success" | "partial" | "failed";
    recordsUpdated: number;
    recordsFailed: number;
    errorMessage?: string;
  }
) {
  await appendDataSourceLog({
    userId,
    sourceName,
    startedAt,
    ...result,
  });
}

export async function runFullDataHealthCheck(): Promise<DataHealthActionResult> {
  try {
    const userId = await requireUserId();
    return { success: true, data: await finish(userId) };
  } catch (e) {
    return {
      success: false,
      error: e instanceof Error ? e.message : "Health check failed.",
    };
  }
}

export async function refreshMarketDataHealth(): Promise<DataHealthActionResult> {
  const userId = await requireUserId();
  const startedAt = new Date().toISOString();
  try {
    if (!isSupabaseConfigured()) {
      throw new Error("Supabase is required for live market data sync.");
    }

    await ensureDefaultWatchlistItems();
    const { sync } = await refreshWatchlistScannerForUser(userId);
    await logRefresh(userId, "market_data", startedAt, {
      status:
        sync.tickersFailed > 0
          ? sync.tickersProcessed > sync.tickersFailed
            ? "partial"
            : "failed"
          : "success",
      recordsUpdated: sync.marketRowsUpserted,
      recordsFailed: sync.tickersFailed,
      errorMessage:
        sync.errors.length > 0 ? sync.errors.slice(0, 3).join("; ") : undefined,
    });
    revalidatePath("/watchlist");
    return { success: true, data: await finish(userId, sync.tickerDiagnostics) };
  } catch (e) {
    const message = e instanceof Error ? e.message : "Market data refresh failed.";
    await logRefresh(userId, "market_data", startedAt, {
      status: "failed",
      recordsUpdated: 0,
      recordsFailed: 0,
      errorMessage: message,
    });
    return { success: false, error: message };
  }
}

export async function refreshTechnicalIndicatorsHealth(): Promise<DataHealthActionResult> {
  const userId = await requireUserId();
  const startedAt = new Date().toISOString();
  try {
    if (!isSupabaseConfigured()) {
      throw new Error("Supabase is required for indicator sync.");
    }

    await ensureDefaultWatchlistItems();
    const { sync } = await refreshWatchlistScannerForUser(userId);
    await logRefresh(userId, "technical_indicators", startedAt, {
      status:
        sync.tickersFailed > 0
          ? sync.tickersProcessed > sync.tickersFailed
            ? "partial"
            : "failed"
          : "success",
      recordsUpdated: sync.indicatorRowsUpserted,
      recordsFailed: sync.tickersFailed,
      errorMessage:
        sync.errors.length > 0 ? sync.errors.slice(0, 3).join("; ") : undefined,
    });
    revalidatePath("/watchlist");
    return { success: true, data: await finish(userId, sync.tickerDiagnostics) };
  } catch (e) {
    const message =
      e instanceof Error ? e.message : "Technical indicator refresh failed.";
    await logRefresh(userId, "technical_indicators", startedAt, {
      status: "failed",
      recordsUpdated: 0,
      recordsFailed: 0,
      errorMessage: message,
    });
    return { success: false, error: message };
  }
}

export async function refreshDividendDataHealth(): Promise<DataHealthActionResult> {
  const userId = await requireUserId();
  const startedAt = new Date().toISOString();
  const result = await syncDividendsFromApi();
  if (!result.success) {
    await logRefresh(userId, "dividend_data", startedAt, {
      status: "failed",
      recordsUpdated: 0,
      recordsFailed: 0,
      errorMessage: result.error,
    });
    return { success: false, error: result.error };
  }

  await logRefresh(userId, "dividend_data", startedAt, {
    status: result.skipped > 0 ? "partial" : "success",
    recordsUpdated: result.synced,
    recordsFailed: result.skipped,
  });
  return { success: true, data: await finish(userId) };
}
