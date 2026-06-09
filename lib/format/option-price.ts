/**
 * Option pricing display and input standard.
 *
 * Per-contract prices: up to 4 decimal places (e.g. 1.0096, 0.2524).
 * Dollar totals: whole dollars (e.g. US$1,550).
 */

import { formatCurrencyAmount } from "@/lib/format/currency";

/** Maximum decimal places for per-contract option prices. */
export const OPTION_PRICE_DECIMALS = 4;

/** HTML input step for option price fields. */
export const OPTION_PRICE_INPUT_STEP = 0.0001;

/** Dollar totals derived from options (premium received, close cost, etc.). */
export const OPTION_DOLLAR_TOTAL_DECIMALS = 0;

/**
 * Format a per-contract option price — up to 4 decimals, trailing zeros trimmed.
 * Examples: 1.0096, 0.2445, 0.0125, 2
 */
export function formatOptionPrice(value: number): string {
  if (!Number.isFinite(value)) return "—";
  const fixed = value.toFixed(OPTION_PRICE_DECIMALS);
  return fixed.replace(/(\.\d*?[1-9])0+$/, "$1").replace(/\.0+$/, "");
}

/** Whole-dollar USD total for options trade amounts. */
export function formatOptionDollarTotal(value: number): string {
  return formatCurrencyAmount(value, "USD", OPTION_DOLLAR_TOTAL_DECIMALS);
}

/** Signed whole-dollar USD total (P/L totals may still use 2 decimals via formatSignedCurrency). */
export function formatSignedOptionDollarTotal(value: number): string {
  const sign = value < 0 ? "-" : value > 0 ? "+" : "";
  return `${sign}${formatOptionDollarTotal(Math.abs(value))}`;
}
