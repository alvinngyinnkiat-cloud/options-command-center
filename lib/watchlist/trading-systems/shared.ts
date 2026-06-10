import {
  isBearCallCandidate,
  isBullPutCandidate,
} from "@/lib/watchlist/scoring/candidate";
import { calculateAveragePricePositionPct } from "@/lib/watchlist/average-price-position";
import { buildAdjustedSupportResistanceLevels } from "@/lib/watchlist/support-resistance-atr";
import { scoreBullPutAdjustedZone } from "@/lib/watchlist/support-resistance-atr";
import type { TradingSystemRecommendation } from "./types";

/** Average price within this % of EMA20 counts as "near". */
export const NEAR_EMA20_BAND_PCT = 2.5;

export function resolveSupportResistance(input: {
  dailySupport: number | null;
  dailyResistance: number | null;
  weeklySupport: number | null;
  weeklyResistance: number | null;
}): { support: number | null; resistance: number | null } {
  return {
    support: input.dailySupport ?? input.weeklySupport,
    resistance: input.dailyResistance ?? input.weeklyResistance,
  };
}

export function positionPct(
  averagePrice: number,
  support: number | null,
  resistance: number | null
): number | null {
  return calculateAveragePricePositionPct(averagePrice, support, resistance);
}

/** Lower half of S/R range — support zone + mid-support. */
export function isNearSupportZone(
  averagePrice: number,
  support: number | null,
  resistance: number | null
): boolean {
  const pct = positionPct(averagePrice, support, resistance);
  if (pct == null) return false;
  return pct <= 50;
}

/** Upper half of S/R range — mid-resistance + resistance zone. */
export function isNearResistanceZone(
  averagePrice: number,
  support: number | null,
  resistance: number | null
): boolean {
  const pct = positionPct(averagePrice, support, resistance);
  if (pct == null) return false;
  return pct >= 50;
}

export function isBetweenSupportAndResistance(
  averagePrice: number,
  support: number | null,
  resistance: number | null
): boolean {
  if (support == null || resistance == null) return false;
  return averagePrice > support && averagePrice < resistance;
}

function isNearLevel(price: number, level: number, atr14: number): boolean {
  if (atr14 > 0) return Math.abs(price - level) <= atr14;
  if (level === 0) return false;
  return Math.abs((price - level) / level) * 100 <= 2.5;
}

/** Price within ATR of raw or ATR-adjusted support. */
export function isNearAdjustedSupport(
  averagePrice: number,
  support: number | null,
  resistance: number | null,
  atr14: number
): boolean {
  if (support == null) return false;
  if (isNearLevel(averagePrice, support, atr14)) return true;
  const adjusted = buildAdjustedSupportResistanceLevels(
    support,
    resistance,
    atr14
  );
  if (adjusted == null) return false;
  return isNearLevel(averagePrice, adjusted.adjustedSupport, atr14);
}

/** Price within ATR of raw or ATR-adjusted resistance. */
export function isNearAdjustedResistance(
  averagePrice: number,
  support: number | null,
  resistance: number | null,
  atr14: number
): boolean {
  if (resistance == null) return false;
  if (isNearLevel(averagePrice, resistance, atr14)) return true;
  const adjusted = buildAdjustedSupportResistanceLevels(
    support,
    resistance,
    atr14
  );
  if (adjusted == null) return false;
  return isNearLevel(averagePrice, adjusted.adjustedResistance, atr14);
}

/** Main System — bullish: avg > SMA200 AND SMA50 > SMA200. */
export function isMainBullishTrend(input: {
  averagePrice: number;
  sma50: number;
  sma200: number;
}): boolean {
  return input.averagePrice > input.sma200 && input.sma50 > input.sma200;
}

/** Main System — bearish: avg < SMA200 AND SMA50 < SMA200. */
export function isMainBearishTrend(input: {
  averagePrice: number;
  sma50: number;
  sma200: number;
}): boolean {
  return input.averagePrice < input.sma200 && input.sma50 < input.sma200;
}

/** Main System — neutral / mixed trend. */
export function isMainNeutralTrend(input: {
  averagePrice: number;
  sma50: number;
  sma200: number;
}): boolean {
  return !isMainBullishTrend(input) && !isMainBearishTrend(input);
}

/** Legacy helpers — used outside Main System scoring. */
export function isBullishTrend(input: {
  averagePrice: number;
  sma50: number;
  sma200: number;
  sma50Previous: number | null;
}): boolean {
  return isBullPutCandidate(input);
}

export function isBearishTrend(input: {
  averagePrice: number;
  sma50: number;
  sma200: number;
  sma50Previous: number | null;
}): boolean {
  return isBearCallCandidate(input);
}

/** All trend signals aligned bullish — Iron Condor not suitable. */
export function isStronglyBullishTrend(input: {
  averagePrice: number;
  sma50: number;
  sma200: number;
}): boolean {
  return (
    input.averagePrice > input.sma50 &&
    input.averagePrice > input.sma200 &&
    input.sma50 > input.sma200
  );
}

/** All trend signals aligned bearish — Iron Condor not suitable. */
export function isStronglyBearishTrend(input: {
  averagePrice: number;
  sma50: number;
  sma200: number;
}): boolean {
  return (
    input.averagePrice < input.sma50 &&
    input.averagePrice < input.sma200 &&
    input.sma50 < input.sma200
  );
}

/** Mixed / conflicting SMA signals — required for Iron Condor eligibility. */
export function isNeutralTrend(input: {
  averagePrice: number;
  sma50: number;
  sma200: number;
}): boolean {
  return isMainNeutralTrend(input);
}

export const IRON_CONDOR_TREND_CAP = 70;

export function srZoneScore(
  averagePrice: number,
  support: number | null,
  resistance: number | null,
  atr14: number,
  side: "put" | "call" | "condor"
): number {
  if (support == null || resistance == null || atr14 <= 0) return 0;
  const zone = scoreBullPutAdjustedZone(
    averagePrice,
    support,
    resistance,
    atr14,
    20,
    side === "put" ? "Support" : side === "call" ? "Resistance" : "Range"
  );
  return zone.score;
}

export function recommendationDirection(
  rec: TradingSystemRecommendation
): "bullish" | "bearish" | "neutral" | "none" {
  if (rec === "Sell Put") return "bullish";
  if (rec === "Sell Call") return "bearish";
  if (rec === "Iron Condor") return "neutral";
  return "none";
}

export function clampScore(value: number, max = 100): number {
  return Math.min(max, Math.max(0, Math.round(value)));
}

export function isAveragePriceRising(
  currentAverage: number,
  previousAverage: number | null
): boolean {
  return previousAverage != null && currentAverage > previousAverage;
}

export function isAveragePriceFalling(
  currentAverage: number,
  previousAverage: number | null
): boolean {
  return previousAverage != null && currentAverage < previousAverage;
}
