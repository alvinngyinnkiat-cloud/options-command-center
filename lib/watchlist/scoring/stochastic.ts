import type { StrategyType } from "@/types/database";
import type { ScoreComponentResult, StochasticScoreInput } from "./types";
import { SCORE_WEIGHTS } from "./types";

export function scoreStochastic(input: StochasticScoreInput): ScoreComponentResult {
  const maxScore = SCORE_WEIGHTS.stochastic;
  const so = input.stochastic;

  switch (input.strategy) {
    case "bull_put_spread":
      return scoreBullPutStochastic(so, maxScore);
    case "bear_call_spread":
      return scoreBearCallStochastic(so, maxScore);
    case "iron_condor":
      return scoreIronCondorStochastic(so, maxScore);
    default:
      return {
        score: 0,
        maxScore,
        passed: false,
        reason: `Unknown strategy: ${input.strategy}`,
      };
  }
}

function scoreBullPutStochastic(so: number, maxScore: number): ScoreComponentResult {
  if (so < 20) {
    return { score: maxScore, maxScore, passed: true, reason: `SO ${so.toFixed(1)} < 20` };
  }
  if (so >= 20 && so < 25) {
    return { score: 16, maxScore, passed: true, reason: `SO ${so.toFixed(1)} in 20–25` };
  }
  if (so >= 25 && so <= 30) {
    return { score: 12, maxScore, passed: true, reason: `SO ${so.toFixed(1)} in 25–30` };
  }
  return {
    score: 0,
    maxScore,
    passed: false,
    reason: `SO ${so.toFixed(1)} > 30 — no Bull Put stochastic credit`,
  };
}

function scoreBearCallStochastic(so: number, maxScore: number): ScoreComponentResult {
  if (so > 80) {
    return { score: maxScore, maxScore, passed: true, reason: `SO ${so.toFixed(1)} > 80` };
  }
  if (so > 75 && so <= 80) {
    return { score: 16, maxScore, passed: true, reason: `SO ${so.toFixed(1)} in 75–80` };
  }
  if (so >= 70 && so <= 75) {
    return { score: 12, maxScore, passed: true, reason: `SO ${so.toFixed(1)} in 70–75` };
  }
  return {
    score: 0,
    maxScore,
    passed: false,
    reason: `SO ${so.toFixed(1)} < 70 — no Bear Call stochastic credit`,
  };
}

function scoreIronCondorStochastic(so: number, maxScore: number): ScoreComponentResult {
  if (so >= 40 && so <= 60) {
    return { score: maxScore, maxScore, passed: true, reason: `SO ${so.toFixed(1)} in 40–60` };
  }
  if (so >= 35 && so < 40) {
    return { score: 14, maxScore, passed: true, reason: `SO ${so.toFixed(1)} in 35–40` };
  }
  if (so > 60 && so <= 65) {
    return { score: 14, maxScore, passed: true, reason: `SO ${so.toFixed(1)} in 60–65` };
  }
  return {
    score: 0,
    maxScore,
    passed: false,
    reason: `SO ${so.toFixed(1)} outside Iron Condor neutral bands`,
  };
}
