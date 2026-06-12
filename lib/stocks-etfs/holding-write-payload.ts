import type { StockEtfHolding } from "@/types/database";

/** Columns removed from stock_etf_holdings writes — not present in all deployments. */
const OMITTED_HOLDING_WRITE_FIELDS = ["tracking_mode"] as const;

type OmittedHoldingField = (typeof OMITTED_HOLDING_WRITE_FIELDS)[number];

export type StockEtfHoldingWritePayload = Omit<
  StockEtfHolding,
  OmittedHoldingField
>;

/** Strip obsolete columns before insert/update/upsert to stock_etf_holdings. */
export function toStockEtfHoldingWritePayload(
  row: StockEtfHolding
): StockEtfHoldingWritePayload {
  const payload = { ...row } as Record<string, unknown>;
  for (const field of OMITTED_HOLDING_WRITE_FIELDS) {
    delete payload[field];
  }
  return payload as StockEtfHoldingWritePayload;
}
