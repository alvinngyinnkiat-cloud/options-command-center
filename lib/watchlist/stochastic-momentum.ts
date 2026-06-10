import type { TradingSystemRecommendation } from "@/lib/watchlist/trading-systems/types";

export type StochasticMomentum = "ROLLING UP" | "ROLLING DOWN" | "STRONG";

/** Classify SO momentum from completed daily bars (current vs previous). */
export function classifyStochasticMomentum(
  currentSo: number,
  previousSo: number | null
): StochasticMomentum {
  if (previousSo == null) return "STRONG";
  if (previousSo < 25 && currentSo > previousSo) return "ROLLING UP";
  if (previousSo > 75 && currentSo < previousSo) return "ROLLING DOWN";
  return "STRONG";
}

export function formatMomentumStatus(momentum: StochasticMomentum): string {
  return momentum;
}

export function isPutMomentumConfirmed(momentum: StochasticMomentum): boolean {
  return momentum === "ROLLING UP" || momentum === "STRONG";
}

export function isCallMomentumConfirmed(momentum: StochasticMomentum): boolean {
  return momentum === "ROLLING DOWN" || momentum === "STRONG";
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
