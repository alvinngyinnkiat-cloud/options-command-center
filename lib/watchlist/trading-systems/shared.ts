import {
  isBearCallCandidate,
  isBullPutCandidate,
} from "@/lib/watchlist/scoring/candidate";
import { calculateAveragePricePositionPct } from "@/lib/watchlist/average-price-position";
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

export function isBelowOrNearEma20(averagePrice: number, ema20: number): boolean {
  if (ema20 <= 0) return false;
  const distancePct = ((averagePrice - ema20) / ema20) * 100;
  return distancePct <= NEAR_EMA20_BAND_PCT;
}

export function isAboveOrNearEma20(averagePrice: number, ema20: number): boolean {
  if (ema20 <= 0) return false;
  const distancePct = ((averagePrice - ema20) / ema20) * 100;
  return distancePct >= -NEAR_EMA20_BAND_PCT;
}

export function isStochasticTurningUp(
  stochastic: number,
  previousStochastic: number | null
): boolean {
  if (previousStochastic == null) return stochastic < 40;
  return stochastic > previousStochastic;
}

export function isStochasticTurningDown(
  stochastic: number,
  previousStochastic: number | null
): boolean {
  if (previousStochastic == null) return stochastic > 60;
  return stochastic < previousStochastic;
}

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
