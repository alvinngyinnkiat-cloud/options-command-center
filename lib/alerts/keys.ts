import type { AlertCategory } from "./types";

export function buildAlertKey(
  type: AlertCategory,
  code: string,
  ticker: string | null = null
): string {
  return `${type}:${code}:${ticker ?? "global"}`;
}
