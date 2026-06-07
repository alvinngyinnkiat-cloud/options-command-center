import {
  allPassed,
  checkBearishTrend,
  checkEma20Pass,
  checkResistanceValid,
  checkStochasticAbove,
  checkTotalScore,
  failedRuleNames,
} from "./rules";
import type { RecommendationInput, StrategyRuleEvaluation } from "./types";

export function evaluateBearCallRecommendation(
  input: RecommendationInput
): StrategyRuleEvaluation {
  const ruleChecks = [
    checkTotalScore(input.score.totalScore),
    checkBearishTrend(input),
    checkStochasticAbove(input.stochastic, 75),
    checkEma20Pass(input.distanceEma20Pct, "bear_call_spread"),
    checkResistanceValid(input.resistance),
  ];

  return {
    strategy: "Bear Call",
    strategyType: "bear_call_spread",
    passesAll: allPassed(ruleChecks),
    ruleChecks,
    failedRules: failedRuleNames(ruleChecks),
  };
}
