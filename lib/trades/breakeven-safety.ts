import type { StrategyType } from "@/types/database";
import type { TradeStrikeInput } from "./types";

export type BreakevenSafetyStatus = "Safe" | "Caution" | "Danger" | "Breached";
export type BreakevenNearestSide = "Put Side" | "Call Side";

export interface BreakevenSafetyResult {
  breakevenPrice: number | null;
  breakevenPutPrice: number | null;
  breakevenCallPrice: number | null;
  distance: number | null;
  distancePct: number | null;
  nearestSide: BreakevenNearestSide | null;
  status: BreakevenSafetyStatus | null;
}

export const BE_SAFE_PCT = 5;
export const BE_CAUTION_PCT = 2;

function round2(value: number): number {
  return Math.round(value * 100) / 100;
}

export function getBreakevenSafetyStatus(
  distancePct: number
): BreakevenSafetyStatus {
  if (distancePct < 0) return "Breached";
  if (distancePct < BE_CAUTION_PCT) return "Danger";
  if (distancePct <= BE_SAFE_PCT) return "Caution";
  return "Safe";
}

export function getBreakevenSafetyTone(
  status: BreakevenSafetyStatus | null
): "safe" | "caution" | "danger" | "muted" {
  switch (status) {
    case "Safe":
      return "safe";
    case "Caution":
      return "caution";
    case "Danger":
    case "Breached":
      return "danger";
    default:
      return "muted";
  }
}

export function formatBreakevenSafetyPct(pct: number | null): string {
  if (pct == null) return "—";
  const sign = pct >= 0 ? "+" : "";
  return `${sign}${pct.toFixed(1)}%`;
}

export function formatBreakevenDistanceDollars(distance: number | null): string {
  if (distance == null) return "—";
  const sign = distance >= 0 ? "+" : "-";
  return `${sign}$${Math.abs(distance).toFixed(2)}`;
}

export function calculateBreakevenSafety(input: {
  strategy: StrategyType;
  premiumPerContract: number;
  currentStockPrice: number | null;
  strikes: TradeStrikeInput;
  breakevenPut: number | null;
  breakevenCall: number | null;
}): BreakevenSafetyResult {
  const { strategy, premiumPerContract, currentStockPrice, strikes } = input;
  const credit = premiumPerContract;
  const price = currentStockPrice;

  if (price == null || price <= 0) {
    return {
      breakevenPrice: input.breakevenPut ?? input.breakevenCall,
      breakevenPutPrice: input.breakevenPut,
      breakevenCallPrice: input.breakevenCall,
      distance: null,
      distancePct: null,
      nearestSide: null,
      status: null,
    };
  }

  if (strategy === "bull_put_spread") {
    const breakevenPrice =
      strikes.shortStrikePut != null
        ? strikes.shortStrikePut - credit
        : input.breakevenPut;
    if (breakevenPrice == null || breakevenPrice <= 0) {
      return emptyResult(null, null);
    }
    const distance = price - breakevenPrice;
    const distancePct = round2((distance / breakevenPrice) * 100);
    return {
      breakevenPrice: round2(breakevenPrice),
      breakevenPutPrice: round2(breakevenPrice),
      breakevenCallPrice: null,
      distance: round2(distance),
      distancePct,
      nearestSide: null,
      status: getBreakevenSafetyStatus(distancePct),
    };
  }

  if (strategy === "bear_call_spread") {
    const breakevenPrice =
      strikes.shortStrikeCall != null
        ? strikes.shortStrikeCall + credit
        : input.breakevenCall;
    if (breakevenPrice == null || breakevenPrice <= 0) {
      return emptyResult(null, null);
    }
    const distance = breakevenPrice - price;
    const distancePct = round2((distance / breakevenPrice) * 100);
    return {
      breakevenPrice: round2(breakevenPrice),
      breakevenPutPrice: null,
      breakevenCallPrice: round2(breakevenPrice),
      distance: round2(distance),
      distancePct,
      nearestSide: null,
      status: getBreakevenSafetyStatus(distancePct),
    };
  }

  if (strategy === "iron_condor") {
    const putBreakeven =
      strikes.shortStrikePut != null
        ? strikes.shortStrikePut - credit
        : input.breakevenPut;
    const callBreakeven =
      strikes.shortStrikeCall != null
        ? strikes.shortStrikeCall + credit
        : input.breakevenCall;

    if (putBreakeven == null || callBreakeven == null) {
      return emptyResult(putBreakeven, callBreakeven);
    }

    const putSideDistance = price - putBreakeven;
    const callSideDistance = callBreakeven - price;
    const nearestSide: BreakevenNearestSide =
      putSideDistance <= callSideDistance ? "Put Side" : "Call Side";
    const distance = Math.min(putSideDistance, callSideDistance);
    const distancePct = round2((distance / price) * 100);
    const breakevenPrice =
      nearestSide === "Put Side" ? putBreakeven : callBreakeven;

    return {
      breakevenPrice: round2(breakevenPrice),
      breakevenPutPrice: round2(putBreakeven),
      breakevenCallPrice: round2(callBreakeven),
      distance: round2(distance),
      distancePct,
      nearestSide,
      status: getBreakevenSafetyStatus(distancePct),
    };
  }

  if (strategy === "sell_put") {
    const breakevenPrice =
      strikes.shortStrikePut != null
        ? strikes.shortStrikePut - credit
        : input.breakevenPut;
    if (breakevenPrice == null || breakevenPrice <= 0) {
      return emptyResult(null, null);
    }
    const distance = price - breakevenPrice;
    const distancePct = round2((distance / breakevenPrice) * 100);
    return {
      breakevenPrice: round2(breakevenPrice),
      breakevenPutPrice: round2(breakevenPrice),
      breakevenCallPrice: null,
      distance: round2(distance),
      distancePct,
      nearestSide: null,
      status: getBreakevenSafetyStatus(distancePct),
    };
  }

  if (strategy === "sell_call") {
    const breakevenPrice =
      strikes.shortStrikeCall != null
        ? strikes.shortStrikeCall + credit
        : input.breakevenCall;
    if (breakevenPrice == null || breakevenPrice <= 0) {
      return emptyResult(null, null);
    }
    const distance = breakevenPrice - price;
    const distancePct = round2((distance / breakevenPrice) * 100);
    return {
      breakevenPrice: round2(breakevenPrice),
      breakevenPutPrice: null,
      breakevenCallPrice: round2(breakevenPrice),
      distance: round2(distance),
      distancePct,
      nearestSide: null,
      status: getBreakevenSafetyStatus(distancePct),
    };
  }

  return emptyResult(null, null);
}

function emptyResult(
  put: number | null,
  call: number | null
): BreakevenSafetyResult {
  return {
    breakevenPrice: put ?? call,
    breakevenPutPrice: put,
    breakevenCallPrice: call,
    distance: null,
    distancePct: null,
    nearestSide: null,
    status: null,
  };
}
