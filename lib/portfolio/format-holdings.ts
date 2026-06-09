import { formatCurrencyAmount, MONEY_DECIMALS } from "@/lib/format/currency";
import type { CurrencyCode } from "@/types/database";

export function formatNativeValue(value: number, currency: CurrencyCode): string {
  const normalized = currency === "SGD" ? "SGD" : "USD";
  return formatCurrencyAmount(value, normalized, MONEY_DECIMALS);
}

export function formatAllocationPct(pct: number): string {
  return `${pct.toFixed(1)}%`;
}
