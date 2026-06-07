import {
  DTE_COMFORT_THRESHOLD,
  DTE_URGENT_THRESHOLD,
  DTE_WARNING_THRESHOLD,
} from "./constants";

export type DteTone = "comfort" | "caution" | "danger";

export function getDteTone(dte: number): DteTone {
  if (dte > DTE_COMFORT_THRESHOLD) return "comfort";
  if (dte >= DTE_WARNING_THRESHOLD) return "caution";
  return "danger";
}

export function getDteReviewLabel(dte: number): string | null {
  if (dte < DTE_URGENT_THRESHOLD) return "URGENT REVIEW";
  if (dte < DTE_WARNING_THRESHOLD) return "REVIEW POSITION";
  return null;
}

export function formatDteLabel(dte: number): string {
  return `DTE ${dte}`;
}

export function formatBreakevenDistance(pct: number | null): string {
  if (pct == null) return "—";
  const sign = pct >= 0 ? "+" : "";
  return `BE ${sign}${pct.toFixed(1)}%`;
}
