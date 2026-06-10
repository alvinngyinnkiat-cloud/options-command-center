import type { RecommendedStrategyLabel } from "@/lib/watchlist/recommendation/types";
import type { TradingSystemRecommendation } from "@/lib/watchlist/trading-systems";
import type { StrategyType } from "@/types/database";

export function tradingSystemToLegacyLabel(
  rec: TradingSystemRecommendation
): RecommendedStrategyLabel {
  switch (rec) {
    case "Sell Put":
      return "Bull Put";
    case "Sell Call":
      return "Bear Call";
    case "Iron Condor":
      return "Iron Condor";
    default:
      return "No Trade";
  }
}

export function tradingSystemToStrategyType(
  rec: TradingSystemRecommendation
): StrategyType | null {
  switch (rec) {
    case "Sell Put":
      return "bull_put_spread";
    case "Sell Call":
      return "bear_call_spread";
    case "Iron Condor":
      return "iron_condor";
    default:
      return null;
  }
}

export function strategyFitScoreToDecisionLabel(
  strategyFitScore: number
): import("@/lib/watchlist/scoring/types").DecisionLabel {
  if (strategyFitScore >= 90) return "Trade Immediately";
  if (strategyFitScore >= 80) return "Strong Candidate";
  if (strategyFitScore >= 75) return "Watchlist";
  return "No Trade";
}
