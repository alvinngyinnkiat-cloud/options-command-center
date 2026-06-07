import type { StrategyType } from "@/types/database";
import {
  detectCandidateStrategy,
  isBearCallCandidate,
  isBullPutCandidate,
  isIronCondorCandidate,
  isSma50Falling,
  isSma50Rising,
} from "./candidate";
import type { ScoreComponentResult, TrendScoreInput } from "./types";
import { SCORE_WEIGHTS } from "./types";

export function scoreTrend(input: TrendScoreInput): ScoreComponentResult & {
  candidateStrategy: StrategyType;
} {
  const maxScore = SCORE_WEIGHTS.trend;
  const candidate = detectCandidateStrategy(input);

  if (isBullPutCandidate(input)) {
    return {
      score: maxScore,
      maxScore,
      passed: true,
      candidateStrategy: candidate,
      reason:
        "Bull Put: avg price > SMA200, SMA50 > SMA200, SMA50 rising",
    };
  }

  if (isBearCallCandidate(input)) {
    return {
      score: maxScore,
      maxScore,
      passed: true,
      candidateStrategy: candidate,
      reason:
        "Bear Call: avg price < SMA200, SMA50 < SMA200, SMA50 falling",
    };
  }

  if (isIronCondorCandidate(input)) {
    return {
      score: maxScore,
      maxScore,
      passed: true,
      candidateStrategy: candidate,
      reason: "Iron Condor: mixed trend / neutral market",
    };
  }

  return {
    score: 0,
    maxScore,
    passed: false,
    candidateStrategy: candidate,
    reason: buildTrendFailReason(input),
  };
}

function buildTrendFailReason(input: TrendScoreInput): string {
  const parts: string[] = [];

  if (input.sma50Previous == null) {
    parts.push("SMA50 prior value required for trend direction");
  }

  const bullChecks = [
    input.averagePrice > input.sma200 ? null : "avg price not above SMA200",
    input.sma50 > input.sma200 ? null : "SMA50 not above SMA200",
    isSma50Rising(input.sma50, input.sma50Previous) ? null : "SMA50 not rising",
  ].filter(Boolean);

  const bearChecks = [
    input.averagePrice < input.sma200 ? null : "avg price not below SMA200",
    input.sma50 < input.sma200 ? null : "SMA50 not below SMA200",
    isSma50Falling(input.sma50, input.sma50Previous) ? null : "SMA50 not falling",
  ].filter(Boolean);

  if (parts.length === 0) {
    parts.push(`No trend filter matched (bull gaps: ${bullChecks.join(", ") || "none"})`);
  }

  return parts.join("; ");
}
