import type { StrategyType } from "@/types/database";
import type { ScoreComponentResult, SupportResistanceScoreInput } from "./types";
import { SCORE_WEIGHTS } from "./types";

export function scoreSupportResistance(
  input: SupportResistanceScoreInput
): ScoreComponentResult {
  const maxScore = SCORE_WEIGHTS.supportResistance;

  if (input.atr14 <= 0) {
    return {
      score: 0,
      maxScore,
      passed: false,
      reason: "ATR14 must be positive for S/R distance scoring",
    };
  }

  switch (input.strategy) {
    case "bull_put_spread":
      return scoreBullPutSr(input, maxScore);
    case "bear_call_spread":
      return scoreBearCallSr(input, maxScore);
    case "iron_condor":
      return scoreIronCondorSr(input, maxScore);
    default:
      return {
        score: 0,
        maxScore,
        passed: false,
        reason: `Unknown strategy: ${input.strategy}`,
      };
  }
}

function scoreBullPutSr(
  input: SupportResistanceScoreInput,
  maxScore: number
): ScoreComponentResult {
  if (input.support == null) {
    return {
      score: 0,
      maxScore,
      passed: false,
      reason: "Manual support required — never auto-generated",
    };
  }

  const atrDistance = (input.averagePrice - input.support) / input.atr14;
  return scoreAtrDistance(atrDistance, maxScore, "support", "Bull Put");
}

function scoreBearCallSr(
  input: SupportResistanceScoreInput,
  maxScore: number
): ScoreComponentResult {
  if (input.resistance == null) {
    return {
      score: 0,
      maxScore,
      passed: false,
      reason: "Manual resistance required — never auto-generated",
    };
  }

  const atrDistance = (input.resistance - input.averagePrice) / input.atr14;
  return scoreAtrDistance(atrDistance, maxScore, "resistance", "Bear Call");
}

function scoreIronCondorSr(
  input: SupportResistanceScoreInput,
  maxScore: number
): ScoreComponentResult {
  if (input.support == null || input.resistance == null) {
    return {
      score: 0,
      maxScore,
      passed: false,
      reason: "Manual support and resistance required — never auto-generated",
    };
  }

  const rangeAtr = (input.resistance - input.support) / input.atr14;

  if (rangeAtr > 4) {
    return {
      score: maxScore,
      maxScore,
      passed: true,
      reason: `S/R range ${rangeAtr.toFixed(2)} ATR > 4`,
    };
  }
  if (rangeAtr >= 3 && rangeAtr <= 4) {
    return {
      score: 16,
      maxScore,
      passed: true,
      reason: `S/R range ${rangeAtr.toFixed(2)} ATR in 3–4`,
    };
  }
  return {
    score: 0,
    maxScore,
    passed: false,
    reason: `S/R range ${rangeAtr.toFixed(2)} ATR < 3`,
  };
}

function scoreAtrDistance(
  atrDistance: number,
  maxScore: number,
  level: string,
  strategyLabel: string
): ScoreComponentResult {
  if (atrDistance < 0) {
    return {
      score: 0,
      maxScore,
      passed: false,
      reason: `Avg price beyond ${level} — negative ATR distance`,
    };
  }

  if (atrDistance < 1) {
    return {
      score: maxScore,
      maxScore,
      passed: true,
      reason: `${strategyLabel}: ${atrDistance.toFixed(2)} ATR from ${level} (< 1)`,
    };
  }
  if (atrDistance >= 1 && atrDistance < 2) {
    return {
      score: 16,
      maxScore,
      passed: true,
      reason: `${strategyLabel}: ${atrDistance.toFixed(2)} ATR from ${level} (1–2)`,
    };
  }
  if (atrDistance >= 2 && atrDistance <= 3) {
    return {
      score: 8,
      maxScore,
      passed: true,
      reason: `${strategyLabel}: ${atrDistance.toFixed(2)} ATR from ${level} (2–3)`,
    };
  }
  return {
    score: 0,
    maxScore,
    passed: false,
    reason: `${strategyLabel}: ${atrDistance.toFixed(2)} ATR from ${level} (> 3)`,
  };
}
