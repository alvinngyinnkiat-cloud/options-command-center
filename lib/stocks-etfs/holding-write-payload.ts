import type { StockEtfHolding } from "@/types/database";

/**
 * Columns known to exist on stock_etf_holdings in production (base + market price).
 * Omits hybrid-tracking columns (tracking_mode, manual_total_*) that may be absent.
 */
const STOCK_ETF_HOLDING_WRITE_COLUMNS = [
  "id",
  "user_id",
  "ticker",
  "asset_type",
  "currency",
  "sector",
  "total_invested_native",
  "current_value_native",
  "fx_rate_to_sgd",
  "total_invested_sgd",
  "current_value_sgd",
  "shares_held",
  "average_cost",
  "notes",
  "last_updated",
  "created_at",
  "updated_at",
  "last_market_price_native",
  "last_price_date",
  "price_source",
  "manual_value_override",
] as const satisfies readonly (keyof StockEtfHolding)[];

export type StockEtfHoldingWritePayload = Pick<
  StockEtfHolding,
  (typeof STOCK_ETF_HOLDING_WRITE_COLUMNS)[number]
>;

/** Strip unknown/obsolete columns before insert/update/upsert to stock_etf_holdings. */
export function toStockEtfHoldingWritePayload(
  row: StockEtfHolding
): StockEtfHoldingWritePayload {
  const payload = {} as StockEtfHoldingWritePayload;
  for (const key of STOCK_ETF_HOLDING_WRITE_COLUMNS) {
    if (key in row) {
      (payload as Record<string, unknown>)[key] = row[key];
    }
  }
  return payload;
}
