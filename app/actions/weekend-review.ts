"use server";

import { attachScoresToRows } from "@/lib/watchlist/scoring/map-row";
import { sortScannerRows } from "@/lib/watchlist/calculations";
import { buildMockScannerRows } from "@/lib/mock/watchlist-scanner";
import { buildWeekendOpportunityLists } from "@/lib/weekend-review/opportunities";
import { buildWeekendReviewPageData } from "@/lib/weekend-review/page-data";
import { buildTickerReviewStatusRows } from "@/lib/weekend-review/review-status";
import { buildWeekendRankings } from "@/lib/weekend-review/rankings";
import { refreshMockScannerRows } from "@/lib/weekend-review/refresh-mock";
import { buildWeekendReviewSummary } from "@/lib/weekend-review/summary";
import { buildWeekendWorkflowAlerts } from "@/lib/weekend-review/workflow-alerts";
import type { WeekendMarketReviewActionResult } from "@/lib/weekend-review/types";
import type { WatchlistScannerRow } from "@/lib/watchlist/types";
import { getOptionsTradesData } from "@/lib/supabase/queries/options-trades";
import { getRiskDashboardData } from "@/lib/supabase/queries/risk-dashboard";
import { getAggregatedIntelligenceImpacts } from "@/lib/supabase/queries/market-intelligence";
import { getWatchlistScannerData } from "@/lib/supabase/queries/watchlist-scanner";
import { buildMarketCondition } from "@/lib/trading-workflow/market-condition";
import { buildTradeQueue } from "@/lib/trading-workflow/trade-queue";
import { persistScannerScores } from "@/lib/supabase/queries/scanner-scores";
import {
  getWeekendReviewStatus,
  getWeeklyMarketUpdateHistory,
  persistWeeklyMarketReviewSnapshots,
} from "@/lib/supabase/queries/weekly-market-updates";
import { isSupabaseConfigured } from "@/lib/supabase/is-configured";
import { resolveAuthenticatedUserId } from "@/lib/supabase/resolve-user";
import { revalidatePath } from "next/cache";

/**
 * Weekend Market Review — refreshes calculated fields and snapshots
 * manual S/R into weekly_market_updates. Never modifies support/resistance.
 */
export async function runWeekendMarketReview(): Promise<WeekendMarketReviewActionResult> {
  try {
    let dataSource: "supabase" | "mock" = isSupabaseConfigured()
      ? "supabase"
      : "mock";
    const userId = await resolveAuthenticatedUserId();

    if (!isSupabaseConfigured()) {
      dataSource = "mock";
    } else if (!userId) {
      return {
        success: false,
        error: "Sign in or set SUPABASE_DEV_USER_ID for local development.",
      };
    }

    const history = await getWeeklyMarketUpdateHistory(200);
    let rows: WatchlistScannerRow[];

    if (dataSource === "supabase") {
      const data = await getWatchlistScannerData();
      const base = data.rows;
      rows = attachScoresToRows(sortScannerRows(base));
      dataSource = data.dataSource;

      if (userId) {
        const scores = rows
          .map((r) => r.score)
          .filter((s): s is NonNullable<(typeof rows)[0]["score"]> => s != null);
        await persistScannerScores(scores, userId);
      }
    } else {
      const base = buildMockScannerRows();
      const refreshed = refreshMockScannerRows(base);
      rows = attachScoresToRows(sortScannerRows(refreshed));
    }

    const { snapshots } = await persistWeeklyMarketReviewSnapshots(rows, userId);

    const rankings = buildWeekendRankings(rows);
    const status = await getWeekendReviewStatus(rows.length, dataSource);
    status.lastReviewDate = snapshots[0]?.reviewDate ?? status.lastReviewDate;
    status.weekEnding = snapshots[0]?.weekEnding ?? status.weekEnding;
    status.tickerCount = rows.length;
    status.isDue = false;

    const summary = buildWeekendReviewSummary(rows, status);
    const opportunities = buildWeekendOpportunityLists(rows);
    const reviewStatusRows = buildTickerReviewStatusRows(rows, status);
    const alerts = buildWeekendWorkflowAlerts(rows, status, [
      ...snapshots,
      ...history,
    ]);

    const [trades, risk, intelligenceMap] = await Promise.all([
      getOptionsTradesData(),
      getRiskDashboardData(),
      getAggregatedIntelligenceImpacts(),
    ]);
    const marketCondition = buildMarketCondition(rows, intelligenceMap);
    const tradeQueue = buildTradeQueue(
      rows,
      trades.trades,
      risk.capitalLiquidity,
      marketCondition
    );

    revalidatePath("/");
    revalidatePath("/trade-queue");
    revalidatePath("/watchlist");
    revalidatePath("/weekend-review");
    revalidatePath("/weekend-ranking");
    revalidatePath("/alerts");

    return {
      success: true,
      status,
      rows,
      rankings,
      snapshots,
      summary,
      opportunities,
      reviewStatusRows,
      alerts,
      tradeQueue,
      dataSource,
    };
  } catch (e) {
    return {
      success: false,
      error: e instanceof Error ? e.message : "Weekend Market Review failed.",
    };
  }
}

export async function fetchWeekendReviewStatus(tickerCount = 0) {
  return getWeekendReviewStatus(tickerCount);
}

export async function fetchWeekendReviewPageData() {
  const { getWeekendReviewPageData } = await import(
    "@/lib/supabase/queries/weekend-review-page"
  );
  return getWeekendReviewPageData();
}
