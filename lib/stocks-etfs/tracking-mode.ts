export type StockEtfTrackingMode = "manual" | "transaction";

export const STOCK_ETF_TRACKING_MODE_LABELS: Record<StockEtfTrackingMode, string> = {
  manual: "Manual Position",
  transaction: "Transaction Accounting",
};

export function isManualTrackingMode(mode: StockEtfTrackingMode): boolean {
  return mode === "manual";
}

export function isTransactionTrackingMode(mode: StockEtfTrackingMode): boolean {
  return mode === "transaction";
}

export function resolveHoldingTrackingMode(
  row: { tracking_mode?: string | null }
): StockEtfTrackingMode {
  return row.tracking_mode === "transaction" ? "transaction" : "manual";
}
