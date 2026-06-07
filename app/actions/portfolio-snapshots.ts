"use server";

import { getPortfolioDashboardData } from "@/lib/supabase/queries/portfolio";
import { getOptionsTradesData } from "@/lib/supabase/queries/options-trades";
import {
  getPortfolioHistoryData,
  upsertDailyPortfolioSnapshot,
} from "@/lib/supabase/queries/daily-portfolio-snapshots";
import type { PortfolioHistoryData } from "@/lib/portfolio/daily-snapshot-types";
import { isSupabaseConfigured } from "@/lib/supabase/is-configured";
import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export type PortfolioSnapshotActionResult =
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

export async function createDailyPortfolioSnapshot(): Promise<PortfolioSnapshotActionResult> {
  try {
    const userId = await resolveUserId();
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
  const userId = await resolveUserId();
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
