import type { StrategyType } from "@/types/database";
import type { EnrichedTrade } from "@/lib/trades/types";
import type { PositionCategory } from "./types";

export function getDisplayStrategyLabel(trade: EnrichedTrade): string {
  if (trade.strategy === "sell_call" && trade.sellCallCoverage === "covered") {
    return "Covered Call";
  }
  switch (trade.strategy) {
    case "bull_put_spread":
      return "Bull Put";
    case "bear_call_spread":
      return "Bear Call";
    case "iron_condor":
      return "Iron Condor";
    case "sell_put":
      return "Sell Put";
    case "sell_call":
      return "Sell Call";
    case "leaps":
      return "LEAPS";
    case "vertical_call_spread":
      return "Vertical Call Spread";
    default:
      return trade.strategyLabel;
  }
}

export function getPositionCategory(
  strategy: StrategyType,
  sellCallCoverage?: EnrichedTrade["sellCallCoverage"]
): PositionCategory {
  if (strategy === "leaps") return "long_term";
  if (strategy === "sell_call" && sellCallCoverage === "covered") {
    return "income";
  }
  return "income";
}

export function isLongTermStrategy(strategy: StrategyType): boolean {
  return strategy === "leaps";
}

export function isDebitLongStrategy(strategy: StrategyType): boolean {
  return strategy === "leaps" || strategy === "vertical_call_spread";
}

export function isCreditIncomeStrategy(strategy: StrategyType): boolean {
  return !isLongTermStrategy(strategy);
}
