/**
 * Deterministic currency formatting for SSR and client hydration.
 * Never uses Intl.NumberFormat or locale-dependent toLocaleString for money.
 *
 * Platform standard — always 2 decimal places:
 * - SGD: S$6,913.68
 * - USD: US$113.51
 */

export type DisplayCurrency = "SGD" | "USD";

/** Standard decimal places for all monetary display across the platform. */
export const MONEY_DECIMALS = 2;

function formatWithSeparators(absValue: number, decimals: number): string {
  const fixed = absValue.toFixed(decimals);
  const [intPart, decPart] = fixed.split(".");
  const grouped = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  if (decimals <= 0 || decPart === undefined) {
    return grouped;
  }
  return `${grouped}.${decPart}`;
}

const CURRENCY_PREFIX: Record<DisplayCurrency, string> = {
  SGD: "S$",
  USD: "US$",
};

const DEFAULT_DECIMALS: Record<DisplayCurrency, number> = {
  SGD: MONEY_DECIMALS,
  USD: MONEY_DECIMALS,
};

export function formatNumber(value: number, decimals = 0): string {
  const sign = value < 0 ? "-" : "";
  return `${sign}${formatWithSeparators(Math.abs(value), decimals)}`;
}

/** Canonical money formatter — thousands separator, exactly 2 decimals by default. */
export function formatMoney(
  value: number,
  currency: DisplayCurrency,
  decimals: number = MONEY_DECIMALS
): string {
  return formatCurrencyAmount(value, currency, decimals);
}

/** Format a native currency amount with explicit prefix (S$ / US$). */
export function formatCurrencyAmount(
  value: number,
  currency: DisplayCurrency,
  decimals?: number
): string {
  const d = decimals ?? DEFAULT_DECIMALS[currency];
  const sign = value < 0 ? "-" : "";
  return `${sign}${CURRENCY_PREFIX[currency]}${formatWithSeparators(
    Math.abs(value),
    d
  )}`;
}

export function formatSgd(
  value: number,
  decimals: number = MONEY_DECIMALS
): string {
  return formatCurrencyAmount(value, "SGD", decimals);
}

export function formatUsd(
  value: number,
  decimals: number = MONEY_DECIMALS
): string {
  return formatCurrencyAmount(value, "USD", decimals);
}

export function formatSignedSgd(
  value: number,
  decimals: number = MONEY_DECIMALS
): string {
  const formatted = formatSgd(Math.abs(value), decimals);
  return value >= 0 ? `+${formatted}` : `-${formatted}`;
}

export function formatSignedUsd(
  value: number,
  decimals: number = MONEY_DECIMALS
): string {
  const formatted = formatUsd(Math.abs(value), decimals);
  return value >= 0 ? `+${formatted}` : `-${formatted}`;
}

/** @deprecated Prefer formatMoney(value, currency). */
export function formatNativeCurrencyValue(
  value: number,
  currency: DisplayCurrency,
  decimals: number = MONEY_DECIMALS
): string {
  return formatCurrencyAmount(value, currency, decimals);
}
