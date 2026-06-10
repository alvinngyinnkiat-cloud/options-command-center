import { scoreEma20Distance } from "./ema20";
import { decisionToAction, getDecisionLabel } from "./decision";
import { scoreStochastic } from "./stochastic";
import { scoreSupportResistance } from "./support-resistance";
import { scoreTrend } from "./trend";
import type { ComputedScore, ScannerScoringInput } from "./types";

export function computeScannerScore(input: ScannerScoringInput): ComputedScore {
  const scoreDate = input.scoreDate ?? new Date().toISOString().split("T")[0];

  const trend = scoreTrend({
    averagePrice: input.averagePrice,
    sma50: input.technicals.sma50,
    sma200: input.technicals.sma200,
    sma50Previous: input.technicals.sma50Previous,
  });

  const strategy = trend.candidateStrategy;

  const stochastic = scoreStochastic({
    stochastic: input.technicals.stochastic,
    strategy,
  });

  const supportResistance = scoreSupportResistance({
    averagePrice: input.averagePrice,
    support: input.support,
    resistance: input.resistance,
    weeklySupport: input.weeklySupport ?? null,
    weeklyResistance: input.weeklyResistance ?? null,
    atr14: input.technicals.atr14,
    strategy,
  });

  /** EMA20 is scored separately in the 20 EMA Reversal System — not part of main total. */
  const ema20 = scoreEma20Distance({
    distanceEma20Pct: input.distanceEma20Pct,
    strategy,
  });

  const componentTotal =
    trend.score + stochastic.score + supportResistance.score;

  const totalScore = componentTotal;

  const decisionLabel = getDecisionLabel(totalScore);

  return {
    watchlistId: input.watchlistId,
    ticker: input.ticker,
    scoreDate,
    candidateStrategy: strategy,
    trend,
    stochastic,
    ema20,
    supportResistance,
    totalScore,
    decisionLabel,
    action: decisionToAction(decisionLabel),
  };
}
