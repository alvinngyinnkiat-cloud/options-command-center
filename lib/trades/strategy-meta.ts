import type { StrategyType } from "@/types/database";

export type SellCallCoverage = "covered" | "naked";

export const CORE_RECOMMENDED_STRATEGIES: StrategyType[] = [
  "bull_put_spread",
  "bear_call_spread",
  "iron_condor",
];

export const FUTURE_STRATEGIES: StrategyType[] = ["sell_put", "sell_call"];

export const ALL_TRADE_STRATEGIES: StrategyType[] = [
  ...CORE_RECOMMENDED_STRATEGIES,
  ...FUTURE_STRATEGIES,
];

export function isSellPutStrategy(strategy: StrategyType): boolean {
  return strategy === "sell_put";
}

export function isSellCallStrategy(strategy: StrategyType): boolean {
  return strategy === "sell_call";
}

export function isSingleLegStrategy(strategy: StrategyType): boolean {
  return isSellPutStrategy(strategy) || isSellCallStrategy(strategy);
}

export function isLeapsStrategy(strategy: StrategyType): boolean {
  return strategy === "leaps";
}

export function isVerticalCallSpreadStrategy(strategy: StrategyType): boolean {
  return strategy === "vertical_call_spread";
}

export function isDebitLongStrategy(strategy: StrategyType): boolean {
  return isLeapsStrategy(strategy) || isVerticalCallSpreadStrategy(strategy);
}

export function isFutureStrategy(strategy: StrategyType): boolean {
  return FUTURE_STRATEGIES.includes(strategy);
}

/** Cash required to secure a short put (assignment at strike). */
export function calculateSellPutCashRequired(
  shortPutStrike: number,
  contracts: number
): number {
  return shortPutStrike * 100 * contracts;
}

/** Max risk for cash-secured put: assignment cost minus premium received. */
export function calculateSellPutMaxRisk(
  shortPutStrike: number,
  contracts: number,
  totalPremiumReceived: number
): number {
  return Math.max(
    0,
    calculateSellPutCashRequired(shortPutStrike, contracts) - totalPremiumReceived
  );
}

/** Shares required to cover short calls. */
export function calculateSellCallRequiredShares(contracts: number): number {
  return contracts * 100;
}

/** Covered call max risk proxy: assignment value minus premium. */
export function calculateCoveredCallMaxRisk(
  shortCallStrike: number,
  contracts: number,
  totalPremiumReceived: number
): number {
  return Math.max(
    0,
    shortCallStrike * 100 * contracts - totalPremiumReceived
  );
}

export const NAKED_CALL_UNLIMITED_RISK_MESSAGE =
  "Unlimited risk. Not recommended.";
