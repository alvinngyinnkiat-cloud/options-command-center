export function formatTickerCurrency(value: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}

export function formatSignedTickerCurrency(value: number): string {
  const abs = formatTickerCurrency(Math.abs(value));
  return value >= 0 ? `+${abs}` : `-${abs}`;
}

export function formatRoiPct(value: number): string {
  return `${value.toFixed(1)}%`;
}

export function formatIncomeYieldPct(value: number): string {
  return `${value.toFixed(2)}%`;
}
