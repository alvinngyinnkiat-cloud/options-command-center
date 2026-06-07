import {
  isBearCallCandidate,
  isBullPutCandidate,
} from "@/lib/watchlist/scoring/candidate";
import { scoreEma20Distance } from "@/lib/watchlist/scoring/ema20";
import type { RecommendationRuleCheck } from "./types";
import type { RecommendationInput } from "./types";

export const MIN_RECOMMENDATION_SCORE = 80;

export function checkTotalScore(
  totalScore: number,
  min = MIN_RECOMMENDATION_SCORE
): RecommendationRuleCheck {
  const passed = totalScore >= min;
  return {
    rule: "Total Score",
    passed,
    detail: passed
      ? `Score ${totalScore} ≥ ${min}`
      : `Score ${totalScore} below ${min} minimum`,
  };
}

export function checkBullishTrend(input: RecommendationInput): RecommendationRuleCheck {
  const passed = isBullPutCandidate({
    averagePrice: input.averagePrice,
    sma50: input.sma50,
    sma200: input.sma200,
    sma50Previous: input.sma50Previous,
  });
  return {
    rule: "Bullish Trend",
    passed,
    detail: passed
      ? "Avg price > SMA200, SMA50 > SMA200, SMA50 rising"
      : "Bullish trend filter not met",
  };
}

export function checkBearishTrend(input: RecommendationInput): RecommendationRuleCheck {
  const passed = isBearCallCandidate({
    averagePrice: input.averagePrice,
    sma50: input.sma50,
    sma200: input.sma200,
    sma50Previous: input.sma50Previous,
  });
  return {
    rule: "Bearish Trend",
    passed,
    detail: passed
      ? "Avg price < SMA200, SMA50 < SMA200, SMA50 falling"
      : "Bearish trend filter not met",
  };
}

export function checkStochasticBelow(
  stochastic: number,
  threshold: number
): RecommendationRuleCheck {
  const passed = stochastic < threshold;
  return {
    rule: "Stochastic",
    passed,
    detail: passed
      ? `SO ${stochastic.toFixed(1)} < ${threshold}`
      : `SO ${stochastic.toFixed(1)} not below ${threshold}`,
  };
}

export function checkStochasticAbove(
  stochastic: number,
  threshold: number
): RecommendationRuleCheck {
  const passed = stochastic > threshold;
  return {
    rule: "Stochastic",
    passed,
    detail: passed
      ? `SO ${stochastic.toFixed(1)} > ${threshold}`
      : `SO ${stochastic.toFixed(1)} not above ${threshold}`,
  };
}

export function checkStochasticRange(
  stochastic: number,
  low: number,
  high: number
): RecommendationRuleCheck {
  const passed = stochastic >= low && stochastic <= high;
  return {
    rule: "Stochastic",
    passed,
    detail: passed
      ? `SO ${stochastic.toFixed(1)} in ${low}–${high}`
      : `SO ${stochastic.toFixed(1)} outside ${low}–${high}`,
  };
}

export function checkEma20Pass(
  distanceEma20Pct: number,
  strategy: "bull_put_spread" | "bear_call_spread" | "iron_condor"
): RecommendationRuleCheck {
  const result = scoreEma20Distance({ distanceEma20Pct, strategy });
  return {
    rule: "EMA20",
    passed: result.passed,
    detail: result.reason,
  };
}

export function checkEma20WithinBand(
  distanceEma20Pct: number,
  band: number
): RecommendationRuleCheck {
  const passed = Math.abs(distanceEma20Pct) <= band;
  return {
    rule: "EMA20",
    passed,
    detail: passed
      ? `EMA20 distance ${distanceEma20Pct.toFixed(2)}% within ±${band}%`
      : `EMA20 distance ${distanceEma20Pct.toFixed(2)}% outside ±${band}%`,
  };
}

export function checkSupportValid(support: number | null): RecommendationRuleCheck {
  const passed = support != null && support > 0;
  return {
    rule: "Support Valid",
    passed,
    detail: passed
      ? `Manual support at ${support}`
      : "Manual support required — never auto-generated",
  };
}

export function checkResistanceValid(
  resistance: number | null
): RecommendationRuleCheck {
  const passed = resistance != null && resistance > 0;
  return {
    rule: "Resistance Valid",
    passed,
    detail: passed
      ? `Manual resistance at ${resistance}`
      : "Manual resistance required — never auto-generated",
  };
}

export function checkRangeWidthAtr(
  support: number | null,
  resistance: number | null,
  atr14: number,
  minAtr: number
): RecommendationRuleCheck {
  if (support == null || resistance == null) {
    return {
      rule: "Range Width",
      passed: false,
      detail: "Manual support and resistance required for range width",
    };
  }
  if (atr14 <= 0) {
    return {
      rule: "Range Width",
      passed: false,
      detail: "ATR14 must be positive",
    };
  }
  const rangeAtr = (resistance - support) / atr14;
  const passed = rangeAtr > minAtr;
  return {
    rule: "Range Width",
    passed,
    detail: passed
      ? `S/R range ${rangeAtr.toFixed(2)} ATR > ${minAtr}`
      : `S/R range ${rangeAtr.toFixed(2)} ATR ≤ ${minAtr}`,
  };
}

export function allPassed(checks: RecommendationRuleCheck[]): boolean {
  return checks.every((c) => c.passed);
}

export function failedRuleNames(checks: RecommendationRuleCheck[]): string[] {
  return checks.filter((c) => !c.passed).map((c) => c.rule);
}
