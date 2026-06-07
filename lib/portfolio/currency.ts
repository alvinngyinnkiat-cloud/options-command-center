import type { CurrencyCode } from "@/types/database";

export const DEFAULT_USD_SGD_RATE = 1.35;

export function calculateMarketValueSgd(
  marketValueNative: number,
  currency: CurrencyCode,
  fxRateToSgd: number
): number {
  if (currency === "SGD") {
    return marketValueNative;
  }
  return Math.round(marketValueNative * fxRateToSgd * 100) / 100;
}

export function resolveFxRateToSgd(
  currency: CurrencyCode,
  fxRateToSgd: number | null | undefined,
  defaultUsdRate: number = DEFAULT_USD_SGD_RATE
): number {
  if (currency === "SGD") return 1;
  return fxRateToSgd && fxRateToSgd > 0 ? fxRateToSgd : defaultUsdRate;
}
