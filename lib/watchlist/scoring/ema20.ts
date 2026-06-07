import type { StrategyType } from "@/types/database";
import type { Ema20ScoreInput, ScoreComponentResult } from "./types";
import { SCORE_WEIGHTS } from "./types";

/** (Average Price - EMA20) / EMA20 × 100 */
export function calculateEma20DistancePct(
  averagePrice: number,
  ema20: number
): number {
  if (ema20 <= 0) return 0;
  return ((averagePrice - ema20) / ema20) * 100;
}

export function scoreEma20Distance(input: Ema20ScoreInput): ScoreComponentResult {
  const maxScore = SCORE_WEIGHTS.ema20;
  const d = input.distanceEma20Pct;

  switch (input.strategy) {
    case "bull_put_spread":
      return scoreBullPutEma(d, maxScore);
    case "bear_call_spread":
      return scoreBearCallEma(d, maxScore);
    case "iron_condor":
      return scoreIronCondorEma(d, maxScore);
    default:
      return {
        score: 0,
        maxScore,
        passed: false,
        reason: `Unknown strategy: ${input.strategy}`,
      };
  }
}

function scoreBullPutEma(d: number, maxScore: number): ScoreComponentResult {
  if (d >= 0 && d <= 2.5) {
    return {
      score: maxScore,
      maxScore,
      passed: true,
      reason: `EMA20 distance ${d.toFixed(2)}% in 0% to +2.5%`,
    };
  }
  if (d < -7.5) {
    return {
      score: maxScore,
      maxScore,
      passed: true,
      reason: `EMA20 distance ${d.toFixed(2)}% below -7.5%`,
    };
  }
  return {
    score: 0,
    maxScore,
    passed: false,
    reason: `EMA20 distance ${d.toFixed(2)}% — no Bull Put EMA credit`,
  };
}

function scoreBearCallEma(d: number, maxScore: number): ScoreComponentResult {
  if (d <= 0 && d >= -2.5) {
    return {
      score: maxScore,
      maxScore,
      passed: true,
      reason: `EMA20 distance ${d.toFixed(2)}% in 0% to -2.5%`,
    };
  }
  if (d > 7.5) {
    return {
      score: maxScore,
      maxScore,
      passed: true,
      reason: `EMA20 distance ${d.toFixed(2)}% above +7.5%`,
    };
  }
  return {
    score: 0,
    maxScore,
    passed: false,
    reason: `EMA20 distance ${d.toFixed(2)}% — no Bear Call EMA credit`,
  };
}

function scoreIronCondorEma(d: number, maxScore: number): ScoreComponentResult {
  if (d >= -2.5 && d <= 2.5) {
    return {
      score: maxScore,
      maxScore,
      passed: true,
      reason: `EMA20 distance ${d.toFixed(2)}% within ±2.5%`,
    };
  }
  return {
    score: 0,
    maxScore,
    passed: false,
    reason: `EMA20 distance ${d.toFixed(2)}% outside ±2.5% neutral band`,
  };
}
