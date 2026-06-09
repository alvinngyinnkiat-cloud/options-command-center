import { STRATEGY_LABELS } from "@/lib/portfolio/types";
import { formatUsd } from "@/lib/format/currency";
import { formatPnL } from "@/lib/format/pnl";
import type { StrategyType } from "@/types/database";

export function formatStrategyLabel(strategy: StrategyType | null): string {
  if (!strategy) return "—";
  return STRATEGY_LABELS[strategy] ?? strategy;
}

export function formatCurrency(value: number): string {
  return formatUsd(value);
}

export function formatSignedCurrency(value: number): string {
  return formatPnL(value, { currency: "USD" });
}
