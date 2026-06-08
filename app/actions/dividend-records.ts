"use server";

import type { DividendFormInput } from "@/lib/dividends/types";
import type { DividendTrackerData } from "@/lib/dividends/types";
import { syncDividendsForUser } from "@/lib/dividends/sync-dividends";
import {
  createDividendRecord,
  getDividendTrackerData,
  removeDividendRecord,
  updateDividendRecord,
} from "@/lib/supabase/queries/dividend-records";
import { getFinancialGoalsData } from "@/lib/supabase/queries/goals";
import { getStockEtfTrackerData } from "@/lib/supabase/queries/stock-etf-holdings";
import { getTickerPositionManagerData } from "@/lib/supabase/queries/ticker-positions";
import { isSupabaseConfigured } from "@/lib/supabase/is-configured";
import { requireUserId } from "@/lib/supabase/resolve-user";
import { revalidatePath } from "next/cache";

export type DividendActionResult =
  | { success: true; data: DividendTrackerData }
  | { success: false; error: string };

export type DividendSyncResult =
  | {
      success: true;
      data: DividendTrackerData;
      synced: number;
      skipped: number;
      providerSource: string;
    }
  | { success: false; error: string };

async function finish(
  providerSource?: "fmp" | "alpha_vantage" | "mock"
): Promise<DividendTrackerData> {
  const userId = await requireUserId();
  const data = await getDividendTrackerData(userId, providerSource);
  revalidatePath("/dividends");
  revalidatePath("/");
  revalidatePath("/reports");
  revalidatePath("/goals");
  revalidatePath("/stocks");
  revalidatePath("/ticker-positions");
  return data;
}

export async function createDividend(
  input: DividendFormInput
): Promise<DividendActionResult> {
  try {
    const userId = await requireUserId();
    await createDividendRecord(input, userId);
    return { success: true, data: await finish() };
  } catch (e) {
    return {
      success: false,
      error: e instanceof Error ? e.message : "Failed to add dividend.",
    };
  }
}

export async function updateDividend(
  id: string,
  input: DividendFormInput
): Promise<DividendActionResult> {
  try {
    const userId = await requireUserId();
    await updateDividendRecord(id, input, userId);
    return { success: true, data: await finish() };
  } catch (e) {
    return {
      success: false,
      error: e instanceof Error ? e.message : "Failed to update dividend.",
    };
  }
}

export async function deleteDividend(
  id: string
): Promise<DividendActionResult> {
  try {
    const userId = await requireUserId();
    await removeDividendRecord(id, userId);
    return { success: true, data: await finish() };
  } catch (e) {
    return {
      success: false,
      error: e instanceof Error ? e.message : "Failed to delete dividend.",
    };
  }
}

export async function syncDividendsFromApi(): Promise<DividendSyncResult> {
  try {
    const userId = await requireUserId();
    const syncResult = await syncDividendsForUser(userId);
    const data = await finish(syncResult.providerSource);
    return { success: true, data, ...syncResult };
  } catch (e) {
    return {
      success: false,
      error: e instanceof Error ? e.message : "Dividend sync failed.",
    };
  }
}

export async function markDividendReceived(
  id: string,
  input: DividendFormInput
): Promise<DividendActionResult> {
  return updateDividend(id, {
    ...input,
    isReceived: true,
    status: "received",
  });
}

export async function refreshDividendDependentData() {
  const userId = await requireUserId();
  const [stockData, tickerData, goalsData, dividendData] = await Promise.all([
    getStockEtfTrackerData(),
    getTickerPositionManagerData(),
    getFinancialGoalsData(),
    getDividendTrackerData(userId),
  ]);
  return { stockData, tickerData, goalsData, dividendData };
}
