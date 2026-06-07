import { STRATEGY_LABELS } from "@/lib/portfolio/types";
import type { StrategyType } from "@/types/database";

export function formatStrategyLabel(strategy: StrategyType | null): string {
  if (!strategy) return "—";
  return STRATEGY_LABELS[strategy] ?? strategy;
}

export function formatCurrency(value: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}

export function formatSignedCurrency(value: number): string {
  const abs = formatCurrency(Math.abs(value));
  return value >= 0 ? `+${abs}` : `-${abs}`;
}
