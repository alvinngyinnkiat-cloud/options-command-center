/** Deterministic number formatting — avoids Node/browser Intl differences during hydration. */

function formatWithSeparators(absValue: number, decimals: number): string {
  const fixed = absValue.toFixed(decimals);
  const [intPart, decPart] = fixed.split(".");
  const grouped = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  if (decimals <= 0 || decPart === undefined) {
    return grouped;
  }
  return `${grouped}.${decPart}`;
}

export function formatNumber(
  value: number,
  decimals = 0
): string {
  const sign = value < 0 ? "-" : "";
  return `${sign}${formatWithSeparators(Math.abs(value), decimals)}`;
}

export function formatUsd(value: number, decimals = 0): string {
  const sign = value < 0 ? "-" : "";
  return `${sign}$${formatWithSeparators(Math.abs(value), decimals)}`;
}

export function formatSgd(value: number, decimals = 0): string {
  return formatUsd(value, decimals);
}

export function formatSignedUsd(value: number, decimals = 0): string {
  const formatted = formatUsd(Math.abs(value), decimals);
  return value >= 0 ? `+${formatted}` : `-${formatted}`;
}

export function formatSignedSgd(value: number, decimals = 0): string {
  return formatSignedUsd(value, decimals);
}

export function formatNativeCurrencyValue(
  value: number,
  currency: "SGD" | "USD",
  decimals = 0
): string {
  const prefix = currency === "SGD" ? "S$" : "US$";
  const sign = value < 0 ? "-" : "";
  return `${sign}${prefix}${formatWithSeparators(Math.abs(value), decimals)}`;
}
