"use server";

import { refreshAutoWatchlistAction } from "@/app/actions/auto-watchlist";
import { syncDividendsFromApi } from "@/app/actions/dividend-records";
import { getDataHealthPageData } from "@/lib/data-health/run-health-check";
import type { DataHealthPageData } from "@/lib/data-health/types";
import { appendDataSourceLog } from "@/lib/supabase/queries/data-source-logs";
import { getWatchlistScannerData } from "@/lib/supabase/queries/watchlist-scanner";
import { isSupabaseConfigured } from "@/lib/supabase/is-configured";
import { requireUserId } from "@/lib/supabase/resolve-user";
import { revalidatePath } from "next/cache";

export type DataHealthActionResult =
  | { success: true; data: DataHealthPageData }
  | { success: false; error: string };

async function finish(userId: string): Promise<DataHealthPageData> {
  revalidatePath("/data-health");
  revalidatePath("/");
  return getDataHealthPageData(userId);
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
    const scanner = await getWatchlistScannerData();
    await logRefresh(userId, "market_data", startedAt, {
      status: "success",
      recordsUpdated: scanner.rows.length,
      recordsFailed: 0,
    });
    return { success: true, data: await finish(userId) };
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
    const scanner = await getWatchlistScannerData();
    await logRefresh(userId, "technical_indicators", startedAt, {
      status: "success",
      recordsUpdated: scanner.rows.length,
      recordsFailed: 0,
    });
    revalidatePath("/watchlist");
    return { success: true, data: await finish(userId) };
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

export async function refreshAutoWatchlistHealth(): Promise<DataHealthActionResult> {
  const userId = await requireUserId();
  const startedAt = new Date().toISOString();
  const result = await refreshAutoWatchlistAction();
  if (!result.success) {
    await logRefresh(userId, "auto_watchlist", startedAt, {
      status: "failed",
      recordsUpdated: 0,
      recordsFailed: 0,
      errorMessage: result.error,
    });
    return { success: false, error: result.error };
  }

  const total = result.data.categories.reduce(
    (s, c) => s + c.entries.length,
    0
  );
  await logRefresh(userId, "auto_watchlist", startedAt, {
    status: "success",
    recordsUpdated: total,
    recordsFailed: 0,
  });
  return { success: true, data: await finish(userId) };
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
