import {
  allPassed,
  checkEma20WithinBand,
  checkRangeWidthAtr,
  checkStochasticRange,
  checkTotalScore,
  failedRuleNames,
} from "./rules";
import type { RecommendationInput, StrategyRuleEvaluation } from "./types";

export function evaluateIronCondorRecommendation(
  input: RecommendationInput
): StrategyRuleEvaluation {
  const ruleChecks = [
    checkTotalScore(input.score.totalScore),
    checkStochasticRange(input.stochastic, 40, 60),
    checkEma20WithinBand(input.distanceEma20Pct, 2.5),
    checkRangeWidthAtr(input.support, input.resistance, input.atr14, 4),
  ];

  return {
    strategy: "Iron Condor",
    strategyType: "iron_condor",
    passesAll: allPassed(ruleChecks),
    ruleChecks,
    failedRules: failedRuleNames(ruleChecks),
  };
}
