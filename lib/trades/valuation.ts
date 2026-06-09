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

/** Manual-only — returns the stored manual value or null when not set. */
export function resolveManualOptionValue(
  manual: number | null | undefined
): number | null {
  if (manual == null || manual < 0 || !Number.isFinite(manual)) return null;
  return manual;
}

/** @deprecated Manual-only tracker — kept for legacy rows; do not use system fallback. */
export function resolveEffectiveOptionValue(
  manual: number | null | undefined,
  _system: number | null | undefined
): number {
  return resolveManualOptionValue(manual) ?? 0;
}

export function resolveActiveValueSource(
  manual: number | null | undefined,
  _storedSource: CurrentValueSource | null | undefined
): CurrentValueSource {
  return resolveManualOptionValue(manual) != null ? "manual" : "manual";
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

export function hasManualCurrentOptionValue(
  manual: number | null | undefined
): boolean {
  return resolveManualOptionValue(manual) != null;
}
