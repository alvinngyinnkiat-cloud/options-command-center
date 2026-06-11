import type { MarketCategory } from "./market-category";
import type { StockEtfCashBalance } from "@/types/database";
import type { CurrencyCode } from "@/types/database";

export const MARKET_CASH_CURRENCY: Record<MarketCategory, CurrencyCode> = {
  us_etf: "USD",
  us_stock: "USD",
  sg_stock: "SGD",
};

export function defaultCashBalances(userId: string): StockEtfCashBalance[] {
  const now = new Date().toISOString();
  return (["us_etf", "us_stock", "sg_stock"] as MarketCategory[]).map(
    (marketCategory) => ({
      id: crypto.randomUUID(),
      user_id: userId,
      market_category: marketCategory,
      cash_native: 0,
      currency: MARKET_CASH_CURRENCY[marketCategory],
      created_at: now,
      updated_at: now,
    })
  );
}

export function cashByCategory(
  rows: StockEtfCashBalance[]
): Record<MarketCategory, number> {
  const map: Record<MarketCategory, number> = {
    us_etf: 0,
    us_stock: 0,
    sg_stock: 0,
  };
  for (const row of rows) {
    const cat = row.market_category as MarketCategory;
    map[cat] = Number(row.cash_native);
  }
  return map;
}

export function applyCashDelta(current: number, delta: number): number {
  return Math.max(0, current + delta);
}

export function calculateLedgerNetAmount(input: {
  transactionType: string;
  amountNative: number;
  feeNative: number;
}): number {
  switch (input.transactionType) {
    case "buy":
      return -(input.amountNative + input.feeNative);
    case "sell":
      return input.amountNative - input.feeNative;
    case "monthly_contribution":
    case "manual_cash_sync":
    case "dividend":
      return input.amountNative;
    default:
      return 0;
  }
}

export function calculateTotalFeesPaid(
  entries: Pick<{ fee_native: number }, "fee_native">[]
): number {
  return entries.reduce((sum, e) => sum + Number(e.fee_native), 0);
}
