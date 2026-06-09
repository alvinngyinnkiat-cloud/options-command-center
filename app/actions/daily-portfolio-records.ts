"use server";

import { getOptionsTradesData } from "@/lib/supabase/queries/options-trades";
import {
  getPortfolioHistoryData,
  persistDailyPortfolioRecord,
  removeDailyPortfolioSnapshot,
  type DailyPortfolioRecordFormInput,
} from "@/lib/supabase/queries/daily-portfolio-snapshots";
import type { PortfolioHistoryData } from "@/lib/portfolio/daily-snapshot-types";
import { getEnrichedPortfolioMetrics } from "@/lib/portfolio/enrich-capital-pools";
import { requireUserId } from "@/lib/supabase/resolve-user";
import { revalidatePath } from "next/cache";

export type DailyPortfolioRecordActionResult =
  | { success: true; history: PortfolioHistoryData }
  | { success: false; error: string };

async function reloadHistory(userId: string): Promise<PortfolioHistoryData> {
  const [{ metrics, capitalPools }, tradesData] = await Promise.all([
    getEnrichedPortfolioMetrics(),
    getOptionsTradesData(),
  ]);
  return getPortfolioHistoryData({
    userId,
    metrics,
    trades: tradesData.trades,
    capitalPools,
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
    const userId = await requireUserId();
    const [{ metrics }, tradesData] = await Promise.all([
      getEnrichedPortfolioMetrics(),
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
    const userId = await requireUserId();
    const [{ metrics }, tradesData] = await Promise.all([
      getEnrichedPortfolioMetrics(),
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
    const userId = await requireUserId();
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
