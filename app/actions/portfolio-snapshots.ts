"use server";

import { getPortfolioDashboardData } from "@/lib/supabase/queries/portfolio";
import { getOptionsTradesData } from "@/lib/supabase/queries/options-trades";
import {
  getPortfolioHistoryData,
  upsertDailyPortfolioSnapshot,
} from "@/lib/supabase/queries/daily-portfolio-snapshots";
import type { PortfolioHistoryData } from "@/lib/portfolio/daily-snapshot-types";
import { requireUserId } from "@/lib/supabase/resolve-user";
import { revalidatePath } from "next/cache";

export type PortfolioSnapshotActionResult =
  | { success: true; history: PortfolioHistoryData }
  | { success: false; error: string };

export async function createDailyPortfolioSnapshot(): Promise<PortfolioSnapshotActionResult> {
  try {
    const userId = await requireUserId();
    const [metrics, tradesData] = await Promise.all([
      getPortfolioDashboardData(),
      getOptionsTradesData(),
    ]);

    await upsertDailyPortfolioSnapshot({
      userId,
      metrics,
      trades: tradesData.trades,
    });

    const history = await getPortfolioHistoryData({
      userId,
      metrics,
      trades: tradesData.trades,
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
