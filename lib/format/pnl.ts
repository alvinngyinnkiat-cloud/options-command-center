import {
  formatCurrencyAmount,
  MONEY_DECIMALS,
  type DisplayCurrency,
} from "@/lib/format/currency";

export type PnLChangeType = "positive" | "negative" | "neutral";

export type PnLColorClass =
  | "text-profit"
  | "text-loss"
  | "text-terminal-muted";

export interface FormatPnLOptions {
  currency?: DisplayCurrency;
  decimals?: number;
}

export function getPnLChangeType(value: number): PnLChangeType {
  if (value > 0) return "positive";
  if (value < 0) return "negative";
  return "neutral";
}

export function getPnLColor(value: number): PnLColorClass {
  switch (getPnLChangeType(value)) {
    case "positive":
      return "text-profit";
    case "negative":
      return "text-loss";
    default:
      return "text-terminal-muted";
  }
}

/** Signed currency P/L — +US$43.40, -US$43.40, US$0.00 (zero has no sign). */
export function formatPnL(
  value: number,
  options: FormatPnLOptions = {}
): string {
  const currency = options.currency ?? "USD";
  const decimals = options.decimals ?? MONEY_DECIMALS;

  if (value === 0) {
    return formatCurrencyAmount(0, currency, decimals);
  }

  const abs = formatCurrencyAmount(Math.abs(value), currency, decimals);
  return value > 0 ? `+${abs}` : `-${abs}`;
}

/** Signed percent — +1.5%, -1.5%, 0.0% (zero has no sign). */
export function formatPnLPercent(value: number, decimals = 1): string {
  if (value === 0) {
    return `${(0).toFixed(decimals)}%`;
  }
  const abs = Math.abs(value).toFixed(decimals);
  return value > 0 ? `+${abs}%` : `-${abs}%`;
}

export function pnlStatProps(value: number, options?: FormatPnLOptions) {
  return {
    value: formatPnL(value, options),
    valueClassName: getPnLColor(value),
    changeType: getPnLChangeType(value),
  };
}

export function pnlPercentStatProps(value: number, decimals = 1) {
  return {
    value:
      value === 0
        ? `${(0).toFixed(decimals)}%`
        : formatPnLPercent(value, decimals),
    valueClassName: getPnLColor(value),
    changeType: getPnLChangeType(value),
  };
}
