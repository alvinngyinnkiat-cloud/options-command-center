import type { CurrentValueSource } from "@/types/database";

export function calculateCurrentCloseCost(
  optionValuePerContract: number,
  contracts: number
): number {
  return optionValuePerContract * 100 * contracts;
}

export function deriveSystemOptionValueFromCloseCost(
  closeCostTotal: number,
  contracts: number
): number {
  if (contracts <= 0) return 0;
  return closeCostTotal / (100 * contracts);
}

export function resolveEffectiveOptionValue(
  manual: number | null | undefined,
  system: number | null | undefined
): number {
  if (manual != null && manual >= 0) return manual;
  return system ?? 0;
}

export function resolveActiveValueSource(
  manual: number | null | undefined,
  storedSource: CurrentValueSource | null | undefined
): CurrentValueSource {
  if (manual != null && manual >= 0) {
    return storedSource === "broker" ? "broker" : "manual";
  }
  return "system";
}

export function calculateValueDifference(
  manual: number | null | undefined,
  system: number | null | undefined
): number | null {
  if (manual == null || system == null) return null;
  return manual - system;
}

export function evaluateProfitStopStatus(input: {
  currentPnl: number;
  currentCloseCost: number;
  profitTargetAmount: number;
  stopLossAmount: number;
}): { takeProfitReached: boolean; stopLossWarning: boolean } {
  return {
    takeProfitReached: input.currentPnl >= input.profitTargetAmount,
    stopLossWarning: input.currentCloseCost >= input.stopLossAmount,
  };
}
