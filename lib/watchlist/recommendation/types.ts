import type { ComputedScore, DecisionLabel } from "@/lib/watchlist/scoring/types";
import type { ScannerAction, StrategyType } from "@/types/database";

export type RecommendedStrategyLabel =
  | "Bull Put"
  | "Bear Call"
  | "Iron Condor"
  | "No Trade";

export interface RecommendationRuleCheck {
  rule: string;
  passed: boolean;
  detail: string;
}

export interface ScoreBreakdownItem {
  category: string;
  score: number;
  maxScore: number;
  passed: boolean;
  reason: string;
}

export interface StrategyRecommendation {
  recommendedStrategy: RecommendedStrategyLabel;
  recommendedStrategyType: StrategyType | null;
  totalScore: number;
  decisionLabel: DecisionLabel | null;
  actionLabel: string;
  action: ScannerAction;
  passFailExplanation: string;
  scoreBreakdown: ScoreBreakdownItem[];
  primaryReason: string;
  warningNotes: string[];
  ruleChecks: RecommendationRuleCheck[];
  /** Future strategies — eligibility only, never auto-recommended */
  sellPutEligible: boolean;
  sellCallEligible: boolean;
  sellPutReason: string;
  sellCallReason: string;
}

export interface RecommendationInput {
  averagePrice: number;
  stochastic: number;
  distanceEma20Pct: number;
  atr14: number;
  support: number | null;
  resistance: number | null;
  sma50: number;
  sma200: number;
  sma50Previous: number | null;
  score: ComputedScore;
  /** USD cash for sell put assignment check (optional) */
  usdCashNative?: number | null;
  /** Shares owned for sell call covered check (optional) */
  sharesOwned?: number | null;
}

export interface StrategyRuleEvaluation {
  strategy: RecommendedStrategyLabel;
  strategyType: StrategyType | null;
  passesAll: boolean;
  ruleChecks: RecommendationRuleCheck[];
  failedRules: string[];
}
