import { formatNativeCurrencyValue } from "@/lib/format/numbers";
import type { CurrencyCode } from "@/types/database";

export function formatNativeValue(value: number, currency: CurrencyCode): string {
  return formatNativeCurrencyValue(value, currency, 0);
}

export function formatAllocationPct(pct: number): string {
  return `${pct.toFixed(1)}%`;
}
