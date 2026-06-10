import { differenceInCalendarDays, parseISO, startOfDay, subDays } from "date-fns";
import { calculateMidPoint } from "@/lib/watchlist/support-resistance-mid";
import { buildAdjustedSupportResistanceLevels } from "@/lib/watchlist/support-resistance-atr";
import {
  classifyStochasticMomentum,
  type StochasticMomentum,
} from "@/lib/watchlist/stochastic-momentum";
import { classifyEmaTrend } from "@/lib/watchlist/trading-systems/ema-reversal-system";
import {
  isBearCallCandidate,
  isBullPutCandidate,
} from "@/lib/watchlist/scoring/candidate";
import type { Direction, WatchlistScannerRow } from "@/lib/watchlist/types";
import { resolveDisplayRank } from "@/lib/watchlist/watchlist-rank";
import type { WeekendReviewStatus } from "@/lib/weekend-review/types";
import type { DecisionLabel } from "./scoring/types";

export type AnalysisSentiment = "bullish" | "bearish" | "neutral";

export interface TickerWeekendReviewFlags {
  updatedThisWeekend: boolean;
  updatedLastWeek: boolean;
  needsReview: boolean;
}

export interface TradingAnalysisViewModel {
  ticker: string;
  watchlistId: string;
  priorityRank: number;
  soValue: number;
  previousSo: number | null;
  momentumStatus: StochasticMomentum;
  momentumSentiment: AnalysisSentiment;
  atr14: number;
  support1: number | null;
  adjustedSupport1: number | null;
  midPoint: number | null;
  resistance1: number | null;
  adjustedResistance1: number | null;
  previousAveragePrice: number;
  currentAveragePrice: number;
  averagePriceDifference: number;
  averagePriceDifferencePct: number;
  averagePriceDirection: Direction;
  ema20: number;
  previousEma20: number | null;
  emaTrend: string;
  averagePriceVsEma20Label: string;
  ema20DistancePct: number;
  ema20PassFail: "Pass" | "Fail" | "—";
  sma200: number;
  sma50: number;
  averagePriceVsSma200Label: string;
  sma50VsSma200Label: string;
  trendDirection: string;
  trendSentiment: AnalysisSentiment;
  emaRecommendation: string;
  emaSystemScore: number | null;
  emaTier: string;
  emaReason: string;
  mainRecommendation: string;
  strategyFitScore: number | null;
  mainTier: string;
  mainReason: string;
  confluenceScore: number | null;
  confluenceReason: string;
  strategy: string;
  action: string;
  primaryReason: string;
  warningNotes: string[];
  weekendReview: TickerWeekendReviewFlags;
  decisionLabel: DecisionLabel | null;
}

/** Mid Point = (Support 1 + Resistance 1) / 2 */
export { calculateMidPoint };

export function getMomentumSentiment(
  momentum: StochasticMomentum
): AnalysisSentiment {
  if (momentum === "ROLLING UP") return "bullish";
  if (momentum === "ROLLING DOWN") return "bearish";
  return "neutral";
}

/** @deprecated Use classifyStochasticMomentum + getMomentumSentiment */
export function getSoRollingLabel(
  stochastic: number,
  direction: import("@/lib/watchlist/types").Direction | null
): { label: string; sentiment: AnalysisSentiment } {
  if (!direction || direction === "flat") {
    return { label: "Flat", sentiment: "neutral" };
  }
  if (direction === "up") {
    if (stochastic < 30) {
      return { label: "Rolling Up", sentiment: "bullish" };
    }
    if (stochastic > 70) {
      return { label: "Rolling Up", sentiment: "neutral" };
    }
    return { label: "Rolling Up", sentiment: "bullish" };
  }
  if (stochastic > 70) {
    return { label: "Rolling Down", sentiment: "bearish" };
  }
  if (stochastic < 30) {
    return { label: "Rolling Down", sentiment: "neutral" };
  }
  return { label: "Rolling Down", sentiment: "bearish" };
}

export function getPriceVsMaLabel(
  price: number,
  ma: number
): { label: string; sentiment: AnalysisSentiment } {
  if (price > ma) return { label: "Above", sentiment: "bullish" };
  if (price < ma) return { label: "Below", sentiment: "bearish" };
  return { label: "At", sentiment: "neutral" };
}

export function getTrendDirectionLabel(row: WatchlistScannerRow): {
  label: string;
  sentiment: AnalysisSentiment;
} {
  const input = {
    averagePrice: row.market.averagePrice,
    sma50: row.technicals.sma50,
    sma200: row.technicals.sma200,
    sma50Previous: row.previousTechnicals.sma50,
  };

  if (isBullPutCandidate(input)) {
    return { label: "Bullish", sentiment: "bullish" };
  }
  if (isBearCallCandidate(input)) {
    return { label: "Bearish", sentiment: "bearish" };
  }
  return { label: "Neutral", sentiment: "neutral" };
}

export function getTickerWeekendReviewFlags(
  row: WatchlistScannerRow,
  status: WeekendReviewStatus
): TickerWeekendReviewFlags {
  const updateDate = row.supportResistance.updateDate;
  const lastReview = status.lastReviewDate;

  if (!lastReview) {
    return {
      updatedThisWeekend: false,
      updatedLastWeek: false,
      needsReview: true,
    };
  }

  const update = startOfDay(parseISO(updateDate));
  const last = startOfDay(parseISO(lastReview));
  const daysBeforeLastReview = differenceInCalendarDays(last, update);

  const updatedThisWeekend = update >= last;
  const previousReviewStart = subDays(last, 7);
  const updatedLastWeek =
    !updatedThisWeekend &&
    update >= previousReviewStart &&
    update < last;

  const needsReview =
    !updatedThisWeekend && (status.isDue || row.supportResistance.support1 == null);

  return { updatedThisWeekend, updatedLastWeek, needsReview };
}

export function buildTradingAnalysisViewModel(
  row: WatchlistScannerRow,
  reviewStatus: WeekendReviewStatus
): TradingAnalysisViewModel {
  const avg = row.averagePriceComparison;
  const momentumStatus = classifyStochasticMomentum(
    row.technicals.stochastic,
    row.previousTechnicals.stochastic
  );
  const momentumSentiment = getMomentumSentiment(momentumStatus);
  const emaTrend = classifyEmaTrend(
    row.technicals.ema20,
    row.previousTechnicals.ema20
  );
  const vsEma20 = getPriceVsMaLabel(
    row.market.averagePrice,
    row.technicals.ema20
  );
  const vsSma200 = getPriceVsMaLabel(
    row.market.averagePrice,
    row.technicals.sma200
  );
  const sma50vs200 = getPriceVsMaLabel(
    row.technicals.sma50,
    row.technicals.sma200
  );
  const trend = getTrendDirectionLabel(row);
  const score = row.score;
  const adjustedLevels = buildAdjustedSupportResistanceLevels(
    row.supportResistance.support1,
    row.supportResistance.resistance1,
    row.technicals.atr14
  );

  return {
    ticker: row.ticker,
    watchlistId: row.watchlistId,
    priorityRank: resolveDisplayRank(row),
    soValue: row.technicals.stochastic,
    previousSo: row.previousTechnicals.stochastic,
    momentumStatus,
    momentumSentiment,
    atr14: row.technicals.atr14,
    support1: row.supportResistance.support1,
    adjustedSupport1: adjustedLevels?.adjustedSupport ?? null,
    midPoint: calculateMidPoint(
      row.supportResistance.support1,
      row.supportResistance.resistance1
    ),
    resistance1: row.supportResistance.resistance1,
    adjustedResistance1: adjustedLevels?.adjustedResistance ?? null,
    previousAveragePrice: avg.previousAverage,
    currentAveragePrice: avg.todayAverage,
    averagePriceDifference: avg.difference,
    averagePriceDifferencePct: avg.differencePct,
    averagePriceDirection: avg.direction,
    ema20: row.technicals.ema20,
    previousEma20: row.previousTechnicals.ema20,
    emaTrend,
    averagePriceVsEma20Label: vsEma20.label,
    ema20DistancePct: row.distances.distanceEma20Pct,
    ema20PassFail: score?.ema20.passed
      ? "Pass"
      : score
        ? "Fail"
        : "—",
    sma200: row.technicals.sma200,
    sma50: row.technicals.sma50,
    averagePriceVsSma200Label: vsSma200.label,
    sma50VsSma200Label: sma50vs200.label,
    trendDirection: trend.label,
    trendSentiment: trend.sentiment,
    emaRecommendation: score?.tradingSystems?.emaSystem.recommendation ?? "—",
    emaSystemScore: score?.tradingSystems?.emaSystem.emaScore ?? null,
    emaTier: score?.tradingSystems?.emaSystem.tier ?? "—",
    emaReason: score?.tradingSystems?.emaSystem.reason ?? "—",
    mainRecommendation: score?.tradingSystems?.mainSystem.recommendation ?? "—",
    strategyFitScore: score?.tradingSystems?.mainSystem.strategyFitScore ?? null,
    mainTier: score?.tradingSystems?.mainSystem.tier ?? "—",
    mainReason: score?.tradingSystems?.mainSystem.reason ?? "—",
    confluenceScore: score?.tradingSystems?.confluence.score ?? null,
    confluenceReason: score?.tradingSystems?.confluence.reason ?? "—",
    strategy:
      score?.tradingSystems?.mainSystem.recommendation ??
      score?.recommendation.recommendedStrategy ??
      "—",
    action: score?.recommendation.actionLabel ?? "—",
    primaryReason: score?.recommendation.primaryReason ?? "—",
    warningNotes: score?.recommendation.warningNotes ?? [],
    weekendReview: getTickerWeekendReviewFlags(row, reviewStatus),
    decisionLabel: score?.decisionLabel ?? null,
  };
}
