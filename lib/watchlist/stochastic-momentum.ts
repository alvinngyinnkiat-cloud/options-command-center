import type { TradingSystemRecommendation } from "@/lib/watchlist/trading-systems/types";

export type StochasticMomentum = "ROLLING UP" | "ROLLING DOWN" | "STRONG";

export type SoDirection = "Rising" | "Falling" | "Flat";

export type SoConfirmationStatus = "PASS" | "FAIL";

/** Classify SO momentum from completed daily bars (current vs previous). Main System only. */
export function classifyStochasticMomentum(
  currentSo: number,
  previousSo: number | null
): StochasticMomentum {
  if (previousSo == null) return "STRONG";
  if (previousSo < 25 && currentSo > previousSo) return "ROLLING UP";
  if (previousSo > 75 && currentSo < previousSo) return "ROLLING DOWN";
  return "STRONG";
}

export function classifySoDirection(
  currentSo: number,
  previousSo: number | null
): SoDirection {
  if (previousSo == null) return "Flat";
  if (currentSo > previousSo) return "Rising";
  if (currentSo < previousSo) return "Falling";
  return "Flat";
}

export function formatMomentumStatus(momentum: StochasticMomentum): string {
  return momentum;
}

export function isPutMomentumConfirmed(momentum: StochasticMomentum): boolean {
  return momentum === "ROLLING UP";
}

export function isCallMomentumConfirmed(momentum: StochasticMomentum): boolean {
  return momentum === "ROLLING DOWN";
}

/**
 * 20 EMA Sell Put — SO turning up from oversold:
 * current > previous AND (current < 25 OR previous < 25).
 */
export function isEmaPutStochasticConfirmed(
  currentSo: number,
  previousSo: number | null
): boolean {
  if (previousSo == null) return false;
  return (
    currentSo > previousSo && (currentSo < 25 || previousSo < 25)
  );
}

/**
 * 20 EMA Sell Call — SO turning down from overbought:
 * current < previous AND (current > 75 OR previous > 75).
 */
export function isEmaCallStochasticConfirmed(
  currentSo: number,
  previousSo: number | null
): boolean {
  if (previousSo == null) return false;
  return (
    currentSo < previousSo && (currentSo > 75 || previousSo > 75)
  );
}

export function evaluateEmaSoTurningUp(
  currentSo: number,
  previousSo: number | null
): SoConfirmationStatus {
  return isEmaPutStochasticConfirmed(currentSo, previousSo) ? "PASS" : "FAIL";
}

export function evaluateEmaSoTurningDown(
  currentSo: number,
  previousSo: number | null
): SoConfirmationStatus {
  return isEmaCallStochasticConfirmed(currentSo, previousSo) ? "PASS" : "FAIL";
}

/** Main System momentum confirmation score (0 or 20). */
export function mainSystemMomentumScore(
  recommendation: Extract<TradingSystemRecommendation, "Sell Put" | "Sell Call">,
  momentum: StochasticMomentum
): number {
  if (recommendation === "Sell Put" && momentum === "ROLLING UP") return 20;
  if (recommendation === "Sell Call" && momentum === "ROLLING DOWN") return 20;
  return 0;
}

/** 20 EMA System stochastic contribution — directional confirmation only. */
export function emaSystemStochasticScore(
  recommendation: Extract<TradingSystemRecommendation, "Sell Put" | "Sell Call" | "No Trade">,
  currentSo: number,
  previousSo: number | null
): number {
  if (recommendation === "Sell Put" || recommendation === "No Trade") {
    if (isEmaPutStochasticConfirmed(currentSo, previousSo)) return 30;
  }
  if (recommendation === "Sell Call") {
    if (isEmaCallStochasticConfirmed(currentSo, previousSo)) return 30;
  }
  return 0;
}
