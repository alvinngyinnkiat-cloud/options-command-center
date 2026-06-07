import type { StrategyType } from "@/types/database";
import type { TrendScoreInput } from "./types";

export function isSma50Rising(sma50: number, sma50Previous: number | null): boolean {
  if (sma50Previous == null) return false;
  return sma50 > sma50Previous;
}

export function isSma50Falling(sma50: number, sma50Previous: number | null): boolean {
  if (sma50Previous == null) return false;
  return sma50 < sma50Previous;
}

export function isBullPutCandidate(input: TrendScoreInput): boolean {
  return (
    input.averagePrice > input.sma200 &&
    input.sma50 > input.sma200 &&
    isSma50Rising(input.sma50, input.sma50Previous)
  );
}

export function isBearCallCandidate(input: TrendScoreInput): boolean {
  return (
    input.averagePrice < input.sma200 &&
    input.sma50 < input.sma200 &&
    isSma50Falling(input.sma50, input.sma50Previous)
  );
}

/** Mixed trend / neutral — fallback when neither bull nor bear filters match. */
export function isIronCondorCandidate(input: TrendScoreInput): boolean {
  return !isBullPutCandidate(input) && !isBearCallCandidate(input);
}

export function detectCandidateStrategy(input: TrendScoreInput): StrategyType {
  if (isBullPutCandidate(input)) return "bull_put_spread";
  if (isBearCallCandidate(input)) return "bear_call_spread";
  return "iron_condor";
}
