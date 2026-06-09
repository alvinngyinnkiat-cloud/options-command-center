import { formatUsd } from "@/lib/format/currency";
import { formatPnL, formatPnLPercent } from "@/lib/format/pnl";

/** US-market income and premium figures (USD, 2 decimal places). */
export function formatTickerCurrency(value: number): string {
  return formatUsd(value);
}

export function formatSignedTickerCurrency(value: number): string {
  return formatPnL(value, { currency: "USD" });
}

export function formatRoiPct(value: number): string {
  return formatPnLPercent(value, 1);
}

export function formatIncomeYieldPct(value: number): string {
  return `${value.toFixed(2)}%`;
}
