/** Where the underlying price shown in Options Trade Tracker comes from. */
export type UnderlyingPriceSource =
  | "market_data"
  | "stock_etf_holdings"
  | "manual_override"
  | "mock"
  | "unavailable";

export interface UnderlyingPriceSnapshot {
  price: number | null;
  source: UnderlyingPriceSource;
  updatedAt: string | null;
  /** When false, breakeven safety must not use this price (missing, stale, or mock in live mode). */
  isUsable: boolean;
}

export const UNDERLYING_PRICE_STALE_DAYS = 7;

export const UNAVAILABLE_UNDERLYING_SNAPSHOT: UnderlyingPriceSnapshot = {
  price: null,
  source: "unavailable",
  updatedAt: null,
  isUsable: false,
};

export function isStaleUnderlyingPriceDate(
  dateStr: string | null | undefined,
  reference = new Date()
): boolean {
  if (!dateStr) return true;
  const dated = new Date(`${dateStr.slice(0, 10)}T12:00:00Z`);
  if (Number.isNaN(dated.getTime())) return true;
  const diffDays =
    (reference.getTime() - dated.getTime()) / (1000 * 60 * 60 * 24);
  return diffDays > UNDERLYING_PRICE_STALE_DAYS;
}

export function formatUnderlyingPriceSourceLabel(
  source: UnderlyingPriceSource
): string {
  switch (source) {
    case "market_data":
      return "Market Data";
    case "stock_etf_holdings":
      return "Stock/ETF Holdings";
    case "manual_override":
      return "Manual Override";
    case "mock":
      return "Mock Data";
    case "unavailable":
      return "Not Available";
  }
}
