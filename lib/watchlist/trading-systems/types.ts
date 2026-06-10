import type { StochasticMomentum, SoConfirmationStatus, SoDirection } from "@/lib/watchlist/stochastic-momentum";

/** Shared recommendation labels across both trading systems. */
export type TradingSystemRecommendation =
  | "Sell Put"
  | "Sell Call"
  | "Iron Condor"
  | "No Trade";

export type ConfluenceStatus =
  | "Both Systems Agree"
  | "One System Agree"
  | "No System Agree";

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

export interface TradingSystemsInput {
  watchlistId: string;
  ticker: string;
  /** Completed candle average: (High + Low) / 2 */
  averagePrice: number;
  /** Previous completed candle average: (High + Low) / 2 */
  previousAveragePrice: number | null;
  atr14: number;
  ema20: number;
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
  baseSrReason: string;
  support: number | null;
  adjustedSupport: number | null;
  resistance: number | null;
  adjustedResistance: number | null;
  emaDifference: number;
  emaDifferencePct: number | null;
  momentumStatus: StochasticMomentum;
  soDirection: SoDirection;
  soTurningUp: SoConfirmationStatus;
  soTurningDown: SoConfirmationStatus;
}

export interface MainTradingSystemResult {
  recommendation: TradingSystemRecommendation;
  strategyFitScore: number;
  tier: StrategyFitTier;
  reason: string;
}

export interface ConfluenceResult {
  status: ConfluenceStatus;
  reason: string;
}

export interface TradingSystemsResult {
  emaSystem: EmaReversalSystemResult;
  mainSystem: MainTradingSystemResult;
  confluence: ConfluenceResult;
  /** Informational summary — does not override either system. */
  decisionReason: string;
}
