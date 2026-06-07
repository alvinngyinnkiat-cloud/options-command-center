import {
  ALERT_BREAKEVEN_PROXIMITY_PCT,
  ALERT_SR_ATR_MULTIPLIER,
} from "./constants";

/** Uses Average Price — Current Price is not used for comparisons. */
export function isAveragePriceNearLevel(
  averagePrice: number,
  level: number,
  proximityPct = ALERT_BREAKEVEN_PROXIMITY_PCT
): boolean {
  if (level <= 0) return false;
  const diffPct = (Math.abs(averagePrice - level) / level) * 100;
  return diffPct <= proximityPct;
}

export function isAveragePriceNearSupport(
  averagePrice: number,
  support: number | null,
  atr14: number | null
): boolean {
  if (support == null) return false;
  if (atr14 != null && atr14 > 0) {
    return Math.abs(averagePrice - support) <= atr14 * ALERT_SR_ATR_MULTIPLIER;
  }
  return isAveragePriceNearLevel(averagePrice, support);
}

export function isAveragePriceNearResistance(
  averagePrice: number,
  resistance: number | null,
  atr14: number | null
): boolean {
  if (resistance == null) return false;
  if (atr14 != null && atr14 > 0) {
    return (
      Math.abs(averagePrice - resistance) <= atr14 * ALERT_SR_ATR_MULTIPLIER
    );
  }
  return isAveragePriceNearLevel(averagePrice, resistance);
}
