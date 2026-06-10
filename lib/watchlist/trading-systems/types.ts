import type { StochasticMomentum } from "@/lib/watchlist/stochastic-momentum";

/** Shared recommendation labels across both trading systems. */
export type TradingSystemRecommendation =
  | "Sell Put"
  | "Sell Call"
  | "Iron Condor"
  | "No Trade";

export type ConfluenceStatus =
  | "STRONG AGREEMENT"
  | "GOOD AGREEMENT"
  | "EARLY SETUP"
  | "MAIN SYSTEM ONLY"
  | "SHORTER-DTE ONLY"
  | "CONFLICTING SIGNALS";

export type EmaScoreTier =
  | "Elite Reversal"
  | "Strong Reversal"
  | "Good Reversal"
  | "Tradable Reversal"
  | "No Trade";

export type StrategyFitTier =
  | "Elite Setup"
  | "A Setup"
  | "Good Setup"
  | "Tradable Setup"
  | "No Trade";

export type ConfluenceTier =
  | "Tier 1"
  | "Tier 2"
  | "Tier 3"
  | "Tier 4";

export interface TradingSystemsInput {
  watchlistId: string;
  ticker: string;
  /** Completed candle average: (High + Low) / 2 */
  averagePrice: number;
  atr14: number;
  ema20: number;
  ema20Previous: number | null;
  sma50: number;
  sma200: number;
  sma50Previous: number | null;
  stochastic: number;
  previousStochastic: number | null;
  dailySupport: number | null;
  dailyResistance: number | null;
  weeklySupport: number | null;
  weeklyResistance: number | null;
  scoreDate?: string;
}

export interface EmaReversalSystemResult {
  recommendation: TradingSystemRecommendation;
  emaScore: number;
  tier: EmaScoreTier;
  reason: string;
  /** Step 1 — S/R base signal before EMA confirmation. */
  baseSrSignal: "Sell Put" | "Sell Call" | "No Trade";
  emaDifference: number;
  emaDifferencePct: number | null;
  emaTrend: "RISING" | "FALLING" | "FLAT" | "—";
  momentumStatus: StochasticMomentum;
}

export interface MainTradingSystemResult {
  recommendation: TradingSystemRecommendation;
  strategyFitScore: number;
  tier: StrategyFitTier;
  reason: string;
}

export interface ConfluenceResult {
  score: number;
  status: ConfluenceStatus;
  tier: ConfluenceTier;
  reason: string;
}

export interface TradingSystemsResult {
  emaSystem: EmaReversalSystemResult;
  mainSystem: MainTradingSystemResult;
  confluence: ConfluenceResult;
  /** Informational summary — does not override either system. */
  decisionReason: string;
}
