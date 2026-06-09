import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { formatSgd, MONEY_DECIMALS } from "@/lib/format/currency";
import { formatPnL } from "@/lib/format/pnl";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** Portfolio and snapshot values are SGD. */
export function formatCurrency(
  value: number,
  decimals: number = MONEY_DECIMALS
): string {
  return formatSgd(value, decimals);
}

export function formatPercent(value: number, decimals = 1): string {
  return `${value >= 0 ? "+" : ""}${value.toFixed(decimals)}%`;
}

export function formatReturnPercent(value: number, decimals = 2): string {
  return `${value.toFixed(decimals)}%`;
}

export function formatSignedCurrency(value: number): string {
  return formatPnL(value, { currency: "SGD" });
}

export function formatSignedSGD(
  value: number,
  decimals: number = MONEY_DECIMALS
): string {
  return formatPnL(value, { currency: "SGD", decimals });
}

export function formatSGD(
  value: number,
  decimals: number = MONEY_DECIMALS
): string {
  return formatSgd(value, decimals);
}

export { formatUsd } from "@/lib/format/currency";

export function formatProgressPercent(value: number, decimals = 1): string {
  return `${Math.min(100, value).toFixed(decimals)}%`;
}
