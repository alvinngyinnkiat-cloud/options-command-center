import type { ScannerAction, StrategyType } from "@/types/database";

export const SCORE_WEIGHTS = {
  trend: 35,
  stochastic: 25,
  ema20: 20,
  supportResistance: 20,
  total: 100,
} as const;

export type DecisionLabel =
  | "Trade Immediately"
  | "Strong Candidate"
  | "Watchlist"
  | "No Trade";

export interface TrendScoreInput {
  averagePrice: number;
  sma50: number;
  sma200: number;
  sma50Previous: number | null;
}

export interface StochasticScoreInput {
  stochastic: number;
  strategy: StrategyType;
}

export interface Ema20ScoreInput {
  distanceEma20Pct: number;
  strategy: StrategyType;
}

export interface SupportResistanceScoreInput {
  averagePrice: number;
  support: number | null;
  resistance: number | null;
  atr14: number;
  strategy: StrategyType;
}

export interface ScoreComponentResult {
  score: number;
  maxScore: number;
  passed: boolean;
  reason: string;
}

export interface ComputedScore {
  watchlistId: string;
  ticker: string;
  scoreDate: string;
  candidateStrategy: StrategyType;
  trend: ScoreComponentResult;
  stochastic: ScoreComponentResult;
  ema20: ScoreComponentResult;
  supportResistance: ScoreComponentResult;
  totalScore: number;
  decisionLabel: DecisionLabel;
  action: ScannerAction;
}

export interface ScannerScoringInput {
  watchlistId: string;
  ticker: string;
  averagePrice: number;
  technicals: {
    atr14: number;
    ema20: number;
    sma50: number;
    sma200: number;
    sma50Previous: number | null;
    stochastic: number;
  };
  distanceEma20Pct: number;
  support: number | null;
  resistance: number | null;
  scoreDate?: string;
}
