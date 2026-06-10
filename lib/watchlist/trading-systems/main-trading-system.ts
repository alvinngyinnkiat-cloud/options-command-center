import type {
  MainTradingSystemResult,
  StrategyFitTier,
  TradingSystemRecommendation,
  TradingSystemsInput,
} from "./types";
import {
  classifyStochasticMomentum,
  mainSystemMomentumScore,
} from "@/lib/watchlist/stochastic-momentum";
import {
  clampScore,
  IRON_CONDOR_TREND_CAP,
  isAveragePriceFalling,
  isAveragePriceRising,
  isBetweenSupportAndResistance,
  isMainBearishTrend,
  isMainBullishTrend,
  isMainNeutralTrend,
  isNearAdjustedResistance,
  isNearAdjustedSupport,
  isStronglyBearishTrend,
  isStronglyBullishTrend,
  positionPct,
  resolveSupportResistance,
  srZoneScore,
} from "./shared";

const STRATEGY_FIT_MIN = 75;

function strategyFitTier(score: number): StrategyFitTier {
  if (score >= 90) return "Elite Setup";
  if (score >= 85) return "A Setup";
  if (score >= 80) return "Good Setup";
  if (score >= 75) return "Tradable Setup";
  return "No Trade";
}

function scoreSellPut(
  input: TradingSystemsInput,
  support: number | null,
  resistance: number | null
): number {
  const momentum = classifyStochasticMomentum(
    input.stochastic,
    input.previousStochastic
  );
  let score = 0;
  if (isMainBullishTrend(input)) score += 35;
  if (input.stochastic < 25) score += 25;
  score += srZoneScore(
    input.averagePrice,
    support,
    resistance,
    input.atr14,
    "put"
  );
  score += mainSystemMomentumScore("Sell Put", momentum);
  return clampScore(score);
}

function scoreSellCall(
  input: TradingSystemsInput,
  support: number | null,
  resistance: number | null
): number {
  const momentum = classifyStochasticMomentum(
    input.stochastic,
    input.previousStochastic
  );
  let score = 0;
  if (isMainBearishTrend(input)) score += 35;
  if (input.stochastic > 75) score += 25;
  score += srZoneScore(
    input.averagePrice,
    support,
    resistance,
    input.atr14,
    "call"
  );
  score += mainSystemMomentumScore("Sell Call", momentum);
  return clampScore(score);
}

function scoreIronCondor(
  input: TradingSystemsInput,
  support: number | null,
  resistance: number | null
): number {
  let score = 0;

  if (isMainNeutralTrend(input)) {
    score += 25;
  }

  if (input.stochastic >= 40 && input.stochastic <= 60) {
    score += 15;
  }

  if (isBetweenSupportAndResistance(input.averagePrice, support, resistance)) {
    score += 20;
  }

  const pct = positionPct(input.averagePrice, support, resistance);
  if (pct != null) {
    const centerDistance = Math.abs(pct - 50);
    score += Math.max(0, 15 - centerDistance * 0.3);
  }

  if (support != null && resistance != null && input.atr14 > 0) {
    const distSupport =
      Math.abs(input.averagePrice - support) / input.atr14;
    const distResistance =
      Math.abs(resistance - input.averagePrice) / input.atr14;
    score += Math.min(15, Math.min(distSupport, distResistance) * 5);

    const rangeAtr = (resistance - support) / input.atr14;
    score += Math.min(10, rangeAtr * 2);
  }

  if (
    isStronglyBullishTrend(input) ||
    isStronglyBearishTrend(input)
  ) {
    return clampScore(Math.min(score, IRON_CONDOR_TREND_CAP));
  }

  return clampScore(score);
}

function sellPutRulesMet(
  input: TradingSystemsInput,
  support: number | null,
  resistance: number | null
): boolean {
  return (
    isMainBullishTrend(input) &&
    input.stochastic < 25 &&
    isAveragePriceRising(input.averagePrice, input.previousAveragePrice) &&
    isNearAdjustedSupport(
      input.averagePrice,
      support,
      resistance,
      input.atr14
    )
  );
}

function sellCallRulesMet(
  input: TradingSystemsInput,
  support: number | null,
  resistance: number | null
): boolean {
  return (
    isMainBearishTrend(input) &&
    input.stochastic > 75 &&
    isAveragePriceFalling(input.averagePrice, input.previousAveragePrice) &&
    isNearAdjustedResistance(
      input.averagePrice,
      support,
      resistance,
      input.atr14
    )
  );
}

function ironCondorRulesMet(
  input: TradingSystemsInput,
  support: number | null,
  resistance: number | null
): boolean {
  return (
    isMainNeutralTrend(input) &&
    input.stochastic >= 40 &&
    input.stochastic <= 60 &&
    isBetweenSupportAndResistance(input.averagePrice, support, resistance)
  );
}

function buildRuleReason(
  rec: TradingSystemRecommendation,
  input: TradingSystemsInput,
  support: number | null,
  resistance: number | null
): string {
  if (rec === "Sell Put") {
    return "Bullish trend, SO < 25, avg price rising, near ATR-adjusted support";
  }
  if (rec === "Sell Call") {
    return "Bearish trend, SO > 75, avg price falling, near ATR-adjusted resistance";
  }
  if (rec === "Iron Condor") {
    if (
      isStronglyBullishTrend(input) ||
      isStronglyBearishTrend(input)
    ) {
      return "Strong directional trend — Iron Condor not suitable";
    }
    return "Neutral trend, SO 40–60, price between support and resistance";
  }
  return "Main system rules not met";
}

/** System 2 — Main premium-selling system (30–45 DTE workflow). */
export function computeMainTradingSystem(
  input: TradingSystemsInput
): MainTradingSystemResult {
  const { support, resistance } = resolveSupportResistance(input);

  const candidates: {
    recommendation: TradingSystemRecommendation;
    score: number;
    valid: boolean;
    reason: string;
  }[] = [
    {
      recommendation: "Sell Put",
      score: scoreSellPut(input, support, resistance),
      valid: sellPutRulesMet(input, support, resistance),
      reason: buildRuleReason("Sell Put", input, support, resistance),
    },
    {
      recommendation: "Sell Call",
      score: scoreSellCall(input, support, resistance),
      valid: sellCallRulesMet(input, support, resistance),
      reason: buildRuleReason("Sell Call", input, support, resistance),
    },
    {
      recommendation: "Iron Condor",
      score: scoreIronCondor(input, support, resistance),
      valid: ironCondorRulesMet(input, support, resistance),
      reason: buildRuleReason("Iron Condor", input, support, resistance),
    },
  ];

  const validCandidates = candidates.filter((c) => c.valid);
  const best =
    validCandidates.length > 0
      ? validCandidates.reduce((a, b) => (b.score > a.score ? b : a))
      : null;

  if (!best || best.score < STRATEGY_FIT_MIN) {
    const topPartial = candidates.reduce((a, b) =>
      b.score > a.score ? b : a
    );
    return {
      recommendation: "No Trade",
      strategyFitScore: topPartial.score,
      tier: strategyFitTier(topPartial.score),
      reason:
        topPartial.score < STRATEGY_FIT_MIN
          ? "Strategy Fit Score below minimum threshold"
          : topPartial.reason,
    };
  }

  return {
    recommendation: best.recommendation,
    strategyFitScore: best.score,
    tier: strategyFitTier(best.score),
    reason: best.reason,
  };
}
