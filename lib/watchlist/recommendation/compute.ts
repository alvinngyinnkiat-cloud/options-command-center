import { decisionToAction } from "@/lib/watchlist/scoring/decision";
import { SCORE_WEIGHTS } from "@/lib/watchlist/scoring/types";
import { evaluateBearCallRecommendation } from "./bear-call";
import { evaluateBullPutRecommendation } from "./bull-put";
import { evaluateIronCondorRecommendation } from "./iron-condor";
import { evaluateFutureStrategyEligibility } from "./future-eligibility";
import type {
  RecommendationInput,
  ScoreBreakdownItem,
  StrategyRecommendation,
  StrategyRuleEvaluation,
} from "./types";

function buildScoreBreakdown(input: RecommendationInput): ScoreBreakdownItem[] {
  const { score } = input;
  return [
    {
      category: "Trend",
      score: score.trend.score,
      maxScore: SCORE_WEIGHTS.trend,
      passed: score.trend.passed,
      reason: score.trend.reason,
    },
    {
      category: "Stochastic",
      score: score.stochastic.score,
      maxScore: SCORE_WEIGHTS.stochastic,
      passed: score.stochastic.passed,
      reason: score.stochastic.reason,
    },
    {
      category: "EMA20",
      score: score.ema20.score,
      maxScore: SCORE_WEIGHTS.ema20,
      passed: score.ema20.passed,
      reason: score.ema20.reason,
    },
    {
      category: "S/R",
      score: score.supportResistance.score,
      maxScore: SCORE_WEIGHTS.supportResistance,
      passed: score.supportResistance.passed,
      reason: score.supportResistance.reason,
    },
  ];
}

function buildPassFailExplanation(evaluation: StrategyRuleEvaluation): string {
  const passed = evaluation.ruleChecks.filter((r) => r.passed);
  const failed = evaluation.ruleChecks.filter((r) => !r.passed);

  const parts: string[] = [];
  if (passed.length > 0) {
    parts.push(`Pass: ${passed.map((r) => r.rule).join(", ")}`);
  }
  if (failed.length > 0) {
    parts.push(`Fail: ${failed.map((r) => `${r.rule} (${r.detail})`).join("; ")}`);
  }
  return parts.join(" · ");
}

function buildWarningNotes(
  input: RecommendationInput,
  evaluations: StrategyRuleEvaluation[]
): string[] {
  const warnings: string[] = [];

  if (input.score.totalScore >= 70 && input.score.totalScore < 80) {
    warnings.push(
      `Total score ${input.score.totalScore} is in Watchlist range but below 80 recommendation threshold`
    );
  }

  if (input.support == null) {
    warnings.push("No manual support entered — Bull Put and Iron Condor blocked");
  }
  if (input.resistance == null) {
    warnings.push("No manual resistance entered — Bear Call and Iron Condor blocked");
  }

  const nearMiss = evaluations
    .filter((e) => !e.passesAll && e.failedRules.length === 1)
    .map((e) => `${e.strategy}: only ${e.failedRules[0]} failed`);

  warnings.push(...nearMiss);

  return warnings;
}

function pickRecommendation(
  evaluations: StrategyRuleEvaluation[]
): StrategyRuleEvaluation {
  const order = ["Bull Put", "Bear Call", "Iron Condor"] as const;
  for (const name of order) {
    const match = evaluations.find((e) => e.strategy === name && e.passesAll);
    if (match) return match;
  }
  return {
    strategy: "No Trade",
    strategyType: null,
    passesAll: false,
    ruleChecks: [],
    failedRules: [],
  };
}

function buildNoTradePrimaryReason(
  input: RecommendationInput,
  evaluations: StrategyRuleEvaluation[]
): string {
  if (input.score.totalScore < 80) {
    return `No Trade — total score ${input.score.totalScore} below 80 minimum`;
  }

  const closest = evaluations
    .map((e) => ({ e, failCount: e.failedRules.length }))
    .sort((a, b) => a.failCount - b.failCount)[0];

  if (closest && closest.failCount > 0) {
    return `No Trade — closest match ${closest.e.strategy} failed: ${closest.e.failedRules.join(", ")}`;
  }

  return "No Trade — no strategy met all Phase 6 recommendation rules";
}

export function computeStrategyRecommendation(
  input: RecommendationInput
): StrategyRecommendation {
  const evaluations = [
    evaluateBullPutRecommendation(input),
    evaluateBearCallRecommendation(input),
    evaluateIronCondorRecommendation(input),
  ];

  const bullPutEval = evaluations[0];
  const bearCallEval = evaluations[1];
  const futureEligibility = evaluateFutureStrategyEligibility(
    input,
    bullPutEval,
    bearCallEval
  );

  const selected = pickRecommendation(evaluations);
  const scoreBreakdown = buildScoreBreakdown(input);
  const warningNotes = buildWarningNotes(input, evaluations);

  if (futureEligibility.sellPutEligible) {
    warningNotes.push(futureEligibility.sellPutReason);
  }
  if (futureEligibility.sellCallEligible) {
    warningNotes.push(futureEligibility.sellCallReason);
  }

  const eligibilityFields = {
    sellPutEligible: futureEligibility.sellPutEligible,
    sellCallEligible: futureEligibility.sellCallEligible,
    sellPutReason: futureEligibility.sellPutReason,
    sellCallReason: futureEligibility.sellCallReason,
  };

  const decisionLabel = input.score.decisionLabel;
  const action = decisionToAction(decisionLabel);

  if (selected.passesAll && selected.strategyType) {
    return {
      recommendedStrategy: selected.strategy,
      recommendedStrategyType: selected.strategyType,
      totalScore: input.score.totalScore,
      decisionLabel,
      actionLabel: decisionLabel,
      action,
      passFailExplanation: buildPassFailExplanation(selected),
      scoreBreakdown,
      primaryReason: `Recommend ${selected.strategy} — all Phase 6 rules passed`,
      warningNotes,
      ruleChecks: selected.ruleChecks,
      ...eligibilityFields,
    };
  }

  const noTradeEval =
    evaluations.find((e) => e.failedRules.length === evaluations[0].failedRules.length) ??
    evaluations[0];

  return {
    recommendedStrategy: "No Trade",
    recommendedStrategyType: null,
    totalScore: input.score.totalScore,
    decisionLabel,
    actionLabel: decisionLabel,
    action,
    passFailExplanation: buildPassFailExplanation(noTradeEval),
    scoreBreakdown,
    primaryReason: buildNoTradePrimaryReason(input, evaluations),
    warningNotes,
    ruleChecks: noTradeEval.ruleChecks,
    ...eligibilityFields,
  };
}
