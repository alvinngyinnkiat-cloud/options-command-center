"use server";

import { getPortfolioDashboardData } from "@/lib/supabase/queries/portfolio";
import { getOptionsTradesData } from "@/lib/supabase/queries/options-trades";
import {
  getPortfolioHistoryData,
  persistDailyPortfolioRecord,
  removeDailyPortfolioSnapshot,
  type DailyPortfolioRecordFormInput,
} from "@/lib/supabase/queries/daily-portfolio-snapshots";
import type { PortfolioHistoryData } from "@/lib/portfolio/daily-snapshot-types";
import { isSupabaseConfigured } from "@/lib/supabase/is-configured";
import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export type DailyPortfolioRecordActionResult =
  | { success: true; history: PortfolioHistoryData }
  | { success: false; error: string };

async function resolveUserId(): Promise<string> {
  if (!isSupabaseConfigured()) return "mock-user";
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user?.id ?? "mock-user";
}

async function reloadHistory(userId: string): Promise<PortfolioHistoryData> {
  const [metrics, tradesData] = await Promise.all([
    getPortfolioDashboardData(),
    getOptionsTradesData(),
  ]);
  return getPortfolioHistoryData({
    userId,
    metrics,
    trades: tradesData.trades,
  });
}

function revalidatePortfolioPaths() {
  revalidatePath("/");
  revalidatePath("/goals");
}

export async function createDailyPortfolioRecord(
  form: DailyPortfolioRecordFormInput
): Promise<DailyPortfolioRecordActionResult> {
  try {
    const userId = await resolveUserId();
    const [metrics, tradesData] = await Promise.all([
      getPortfolioDashboardData(),
      getOptionsTradesData(),
    ]);

    await persistDailyPortfolioRecord({
      userId,
      form,
      metrics,
      trades: tradesData.trades,
    });

    const history = await reloadHistory(userId);
    revalidatePortfolioPaths();
    return { success: true, history };
  } catch (e) {
    return {
      success: false,
      error: e instanceof Error ? e.message : "Failed to add portfolio record.",
    };
  }
}

export async function updateDailyPortfolioRecord(
  recordId: string,
  form: DailyPortfolioRecordFormInput
): Promise<DailyPortfolioRecordActionResult> {
  try {
    const userId = await resolveUserId();
    const [metrics, tradesData] = await Promise.all([
      getPortfolioDashboardData(),
      getOptionsTradesData(),
    ]);

    await persistDailyPortfolioRecord({
      userId,
      form,
      metrics,
      trades: tradesData.trades,
      recordId,
    });

    const history = await reloadHistory(userId);
    revalidatePortfolioPaths();
    return { success: true, history };
  } catch (e) {
    return {
      success: false,
      error:
        e instanceof Error ? e.message : "Failed to update portfolio record.",
    };
  }
}

export async function deleteDailyPortfolioRecord(
  recordId: string
): Promise<DailyPortfolioRecordActionResult> {
  try {
    const userId = await resolveUserId();
    await removeDailyPortfolioSnapshot(userId, recordId);
    const history = await reloadHistory(userId);
    revalidatePortfolioPaths();
    return { success: true, history };
  } catch (e) {
    return {
      success: false,
      error:
        e instanceof Error ? e.message : "Failed to delete portfolio record.",
    };
  }
}
