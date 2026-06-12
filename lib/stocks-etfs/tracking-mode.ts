/** @deprecated Transaction history is the only workflow; kept for legacy rows. */
export type StockEtfTrackingMode = "manual" | "transaction";

export function resolveHoldingTrackingMode(
  _row: { tracking_mode?: string | null }
): StockEtfTrackingMode {
  return "transaction";
}
