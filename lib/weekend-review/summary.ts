import type { WatchlistScannerRow } from "@/lib/watchlist/types";
import { buildTickerReviewStatusRows } from "./review-status";
import type { WeekendReviewSummary } from "./types";
import type { WeekendReviewStatus } from "./types";

export function buildWeekendReviewSummary(
  rows: WatchlistScannerRow[],
  reviewStatus: WeekendReviewStatus
): WeekendReviewSummary {
  const statusRows = buildTickerReviewStatusRows(rows, reviewStatus);

  let bullPut = 0;
  let bearCall = 0;
  let ironCondor = 0;
  let noTrade = 0;

  for (const row of rows) {
    const strategy = row.score?.recommendation.recommendedStrategy;
    if (strategy === "Bull Put") bullPut++;
    else if (strategy === "Bear Call") bearCall++;
    else if (strategy === "Iron Condor") ironCondor++;
    else if (strategy === "No Trade") noTrade++;
  }

  const scored = rows
    .filter((r) => r.score)
    .sort((a, b) => (b.score!.totalScore) - (a.score!.totalScore));

  const best = scored[0];
  const tradeable = scored.filter(
    (r) => r.score!.recommendation.recommendedStrategy !== "No Trade"
  );

  return {
    totalTickers: rows.length,
    updatedThisWeekend: statusRows.filter(
      (r) => r.statusKey === "updated_this_weekend"
    ).length,
    updatedLastWeek: statusRows.filter(
      (r) => r.statusKey === "updated_last_week"
    ).length,
    needsReview: statusRows.filter((r) => r.statusKey === "needs_review").length,
    bullPutCandidates: bullPut,
    bearCallCandidates: bearCall,
    ironCondorCandidates: ironCondor,
    noTradeCount: noTrade,
    highestScoreTicker: best?.ticker ?? null,
    highestScore: best?.score?.totalScore ?? 0,
    bestOpportunityTicker: tradeable[0]?.ticker ?? null,
    bestOpportunityStrategy:
      tradeable[0]?.score?.recommendation.recommendedStrategy ?? null,
    bestOpportunityAction:
      tradeable[0]?.score?.recommendation.actionLabel ?? null,
  };
}
