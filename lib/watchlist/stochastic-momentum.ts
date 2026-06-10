import type { TradingSystemRecommendation } from "@/lib/watchlist/trading-systems/types";

export type StochasticMomentum = "ROLLING UP" | "ROLLING DOWN" | "STRONG";

/** Classify SO momentum from completed daily bars (current vs previous). */
export function classifyStochasticMomentum(
  currentSo: number,
  previousSo: number | null
): StochasticMomentum {
  if (previousSo == null) return "STRONG";
  if (previousSo < 25 && currentSo > 25) return "ROLLING UP";
  if (previousSo > 75 && currentSo < 75) return "ROLLING DOWN";
  return "STRONG";
}

export function formatMomentumStatus(momentum: StochasticMomentum): string {
  return momentum;
}

/** Main System stochastic contribution by strategy. */
export function mainSystemStochasticScore(
  recommendation: TradingSystemRecommendation,
  momentum: StochasticMomentum,
  currentSo: number
): number {
  if (recommendation === "Sell Put") {
    if (momentum === "ROLLING UP") return 25;
    if (momentum === "STRONG") return 15;
    return 0;
  }
  if (recommendation === "Sell Call") {
    if (momentum === "ROLLING DOWN") return 25;
    if (momentum === "STRONG") return 15;
    return 0;
  }
  if (recommendation === "Iron Condor") {
    if (currentSo >= 40 && currentSo <= 60) return 25;
    if (currentSo >= 35 && currentSo <= 65) return 15;
    return 0;
  }
  return 0;
}

/** 20 EMA System stochastic contribution (no Iron Condor). */
export function emaSystemStochasticScore(
  recommendation: Extract<TradingSystemRecommendation, "Sell Put" | "Sell Call" | "No Trade">,
  momentum: StochasticMomentum
): number {
  if (recommendation === "Sell Put") {
    if (momentum === "ROLLING UP") return 30;
    if (momentum === "STRONG") return 15;
    return 0;
  }
  if (recommendation === "Sell Call") {
    if (momentum === "ROLLING DOWN") return 30;
    if (momentum === "STRONG") return 15;
    return 0;
  }
  return 0;
}

export function isPutMomentumConfirmed(momentum: StochasticMomentum): boolean {
  return momentum === "ROLLING UP";
}

export function isCallMomentumConfirmed(momentum: StochasticMomentum): boolean {
  return momentum === "ROLLING DOWN";
}
