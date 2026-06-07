export const DIVIDEND_DATA_UPDATED_EVENT = "occ-dividend-data-updated";

export function notifyDividendDataUpdated() {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent(DIVIDEND_DATA_UPDATED_EVENT));
}
