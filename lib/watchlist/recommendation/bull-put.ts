import {
  allPassed,
  checkBullishTrend,
  checkEma20Pass,
  checkStochasticBelow,
  checkSupportValid,
  checkTotalScore,
  failedRuleNames,
} from "./rules";
import type { RecommendationInput, StrategyRuleEvaluation } from "./types";

export function evaluateBullPutRecommendation(
  input: RecommendationInput
): StrategyRuleEvaluation {
  const ruleChecks = [
    checkTotalScore(input.score.totalScore),
    checkBullishTrend(input),
    checkStochasticBelow(input.stochastic, 25),
    checkEma20Pass(input.distanceEma20Pct, "bull_put_spread"),
    checkSupportValid(input.support),
  ];

  return {
    strategy: "Bull Put",
    strategyType: "bull_put_spread",
    passesAll: allPassed(ruleChecks),
    ruleChecks,
    failedRules: failedRuleNames(ruleChecks),
  };
}
