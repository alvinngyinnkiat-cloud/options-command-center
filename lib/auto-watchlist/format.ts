export function formatMarketCapBillions(billions: number): string {
  if (billions >= 1000) {
    return `$${(billions / 1000).toFixed(2)}T`;
  }
  return `$${billions.toFixed(1)}B`;
}

export function formatPerformancePct(pct: number): string {
  const sign = pct > 0 ? "+" : "";
  return `${sign}${pct.toFixed(1)}%`;
}

export function formatPrice(price: number): string {
  return `$${price.toFixed(2)}`;
}
