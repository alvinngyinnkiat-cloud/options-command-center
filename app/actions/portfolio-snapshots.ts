"use server";

import { getOptionsTradesData } from "@/lib/supabase/queries/options-trades";
import {
  getPortfolioHistoryData,
  upsertDailyPortfolioSnapshot,
} from "@/lib/supabase/queries/daily-portfolio-snapshots";
import type { PortfolioHistoryData } from "@/lib/portfolio/daily-snapshot-types";
import { getEnrichedPortfolioMetrics } from "@/lib/portfolio/enrich-capital-pools";
import { getSingaporeSnapshotDate } from "@/lib/portfolio/snapshot-date";
import { requireUserId } from "@/lib/supabase/resolve-user";
import { revalidatePath } from "next/cache";

export type PortfolioSnapshotActionResult =
  | { success: true; history: PortfolioHistoryData }
  | { success: false; error: string };

export async function createDailyPortfolioSnapshot(): Promise<PortfolioSnapshotActionResult> {
  try {
    const userId = await requireUserId();
    const [{ metrics, capitalPools }, tradesData] = await Promise.all([
      getEnrichedPortfolioMetrics(),
      getOptionsTradesData(),
    ]);
    const today = getSingaporeSnapshotDate();

    await upsertDailyPortfolioSnapshot({
      userId,
      metrics,
      trades: tradesData.trades,
      capitalPools,
      snapshotDate: today,
      allowManualOverwrite: true,
    });

    const history = await getPortfolioHistoryData({
      userId,
      metrics,
      trades: tradesData.trades,
      capitalPools,
      asOfDate: today,
    });

    revalidatePath("/");
    revalidatePath("/goals");
    return { success: true, history };
  } catch (e) {
    return {
      success: false,
      error:
        e instanceof Error ? e.message : "Failed to create daily snapshot.",
    };
  }
}

export async function loadPortfolioHistoryData(): Promise<PortfolioHistoryData> {
  const userId = await requireUserId();
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
