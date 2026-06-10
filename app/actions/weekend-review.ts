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
import { getWatchlistScannerData } from "@/lib/supabase/queries/watchlist-scanner";
import { buildTradeQueue } from "@/lib/trading-workflow/trade-queue";
import { persistScannerScores } from "@/lib/supabase/queries/scanner-scores";
import {
  getWeekendReviewStatus,
  getWeeklyMarketUpdateHistory,
  persistWeeklyMarketReviewSnapshots,
} from "@/lib/supabase/queries/weekly-market-updates";
import { isSupabaseConfigured } from "@/lib/supabase/is-configured";
import { resolveSupabaseReadUserId, MOCK_USER_ID } from "@/lib/supabase/resolve-user";
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
    const resolvedUserId = await resolveSupabaseReadUserId();

    if (!isSupabaseConfigured()) {
      dataSource = "mock";
    } else if (!resolvedUserId) {
      return {
        success: false,
        error:
          "Live database access unavailable. Set SUPABASE_DEV_USER_ID and SUPABASE_SERVICE_ROLE_KEY, or sign in.",
      };
    }

    const userId = resolvedUserId ?? MOCK_USER_ID;

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

    const tradeQueue = buildTradeQueue(rows);

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
