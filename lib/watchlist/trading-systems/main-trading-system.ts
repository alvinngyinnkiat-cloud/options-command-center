import type {
  MainTradingSystemResult,
  StrategyFitTier,
  TradingSystemsInput,
} from "./types";
import {
  classifyStochasticMomentum,
  mainSystemStochasticScore,
} from "@/lib/watchlist/stochastic-momentum";
import {
  clampScore,
  IRON_CONDOR_TREND_CAP,
  isBetweenSupportAndResistance,
  isBullishTrend,
  isNearResistanceZone,
  isNearSupportZone,
  isNeutralTrend,
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

function computeIronCondorScore(
  systems: TradingSystemsInput,
  support: number | null,
  resistance: number | null
): number {
  const momentum = classifyStochasticMomentum(
    systems.stochastic,
    systems.previousStochastic
  );
  const soScore = mainSystemStochasticScore(
    "Iron Condor",
    momentum,
    systems.stochastic
  );
  const neutral = isNeutralTrend(systems);

  if (!neutral) {
    let capped = 35;
    if (isBetweenSupportAndResistance(systems.averagePrice, support, resistance)) {
      capped += 15;
    }
    capped += soScore;
    if (isStronglyBullishTrend(systems) || isStronglyBearishTrend(systems)) {
      capped += 5;
    }
    return clampScore(Math.min(capped, IRON_CONDOR_TREND_CAP));
  }

  let score = 10;

  // Major factor — neutral / mixed trend
  score += 25;

  score += soScore;

  if (isBetweenSupportAndResistance(systems.averagePrice, support, resistance)) {
    score += 10;
  }

  const pct = positionPct(systems.averagePrice, support, resistance);
  if (pct != null) {
    const centerDistance = Math.abs(pct - 50);
    score += Math.max(0, 15 - centerDistance * 0.3);
  }

  if (support != null && resistance != null && systems.atr14 > 0) {
    const distSupport =
      Math.abs(systems.averagePrice - support) / systems.atr14;
    const distResistance =
      Math.abs(resistance - systems.averagePrice) / systems.atr14;
    const minDist = Math.min(distSupport, distResistance);
    score += Math.min(15, minDist * 5);

    const rangeAtr = (resistance - support) / systems.atr14;
    score += Math.min(10, rangeAtr * 2);
  }

  score += srZoneScore(
    systems.averagePrice,
    support,
    resistance,
    systems.atr14,
    "condor"
  );

  return clampScore(score);
}

function computeStrategyFitScore(input: {
  systems: TradingSystemsInput;
  recommendation: MainTradingSystemResult["recommendation"];
}): number {
  const { systems, recommendation } = input;
  const { support, resistance } = resolveSupportResistance(systems);
  const momentum = classifyStochasticMomentum(
    systems.stochastic,
    systems.previousStochastic
  );

  if (recommendation === "No Trade") {
    let partial = 0;
    if (isNearSupportZone(systems.averagePrice, support, resistance)) partial += 10;
    if (isNearResistanceZone(systems.averagePrice, support, resistance)) partial += 10;
    partial += mainSystemStochasticScore(
      "Iron Condor",
      momentum,
      systems.stochastic
    );

    const icLike =
      isBetweenSupportAndResistance(systems.averagePrice, support, resistance) &&
      systems.stochastic >= 35 &&
      systems.stochastic <= 65;

    if (icLike && !isNeutralTrend(systems)) {
      return computeIronCondorScore(systems, support, resistance);
    }

    return clampScore(partial);
  }

  let score = 45;

  if (recommendation === "Sell Put") {
    if (isBullishTrend(systems)) score += 20;
    score += mainSystemStochasticScore("Sell Put", momentum, systems.stochastic);
    score += srZoneScore(
      systems.averagePrice,
      support,
      resistance,
      systems.atr14,
      "put"
    );
    if (systems.atr14 > 0) {
      const atrPct = (systems.atr14 / systems.averagePrice) * 100;
      score += Math.max(0, 10 - atrPct);
    }
  } else if (recommendation === "Sell Call") {
    score += mainSystemStochasticScore("Sell Call", momentum, systems.stochastic);
    score += srZoneScore(
      systems.averagePrice,
      support,
      resistance,
      systems.atr14,
      "call"
    );
    if (systems.atr14 > 0) {
      const atrPct = (systems.atr14 / systems.averagePrice) * 100;
      score += Math.max(0, 10 - atrPct);
    }
    if (!isBullishTrend(systems)) score += 8;
  } else if (recommendation === "Iron Condor") {
    return computeIronCondorScore(systems, support, resistance);
  }

  return clampScore(score);
}

/** System 2 — Main premium-selling system. Can output Iron Condor. */
export function computeMainTradingSystem(
  input: TradingSystemsInput
): MainTradingSystemResult {
  const { support, resistance } = resolveSupportResistance(input);

  const bullish = isBullishTrend(input);
  const nearSupport = isNearSupportZone(
    input.averagePrice,
    support,
    resistance
  );
  const nearResistance = isNearResistanceZone(
    input.averagePrice,
    support,
    resistance
  );
  const betweenSr = isBetweenSupportAndResistance(
    input.averagePrice,
    support,
    resistance
  );
  const soNeutral =
    input.stochastic >= 40 && input.stochastic <= 60;
  const trendNeutral = isNeutralTrend(input);

  let ruleRecommendation: MainTradingSystemResult["recommendation"] = "No Trade";
  let ruleReason = "Main system rules not met";

  if (bullish && input.stochastic < 25 && nearSupport) {
    ruleRecommendation = "Sell Put";
    ruleReason = "Bullish trend, SO < 25, near support";
  } else if (input.stochastic > 75 && nearResistance) {
    ruleRecommendation = "Sell Call";
    ruleReason = "SO > 75, near resistance";
  } else if (betweenSr && soNeutral && trendNeutral) {
    ruleRecommendation = "Iron Condor";
    ruleReason = "Between support/resistance, SO 40–60, neutral trend";
  } else if (betweenSr && soNeutral && !trendNeutral) {
    ruleReason = isStronglyBullishTrend(input)
      ? "Strongly bullish trend — Iron Condor not suitable"
      : isStronglyBearishTrend(input)
        ? "Strongly bearish trend — Iron Condor not suitable"
        : "Trend not neutral for Iron Condor";
  } else {
    const misses: string[] = [];
    if (bullish && input.stochastic >= 25) misses.push("SO not oversold");
    if (!nearSupport && bullish) misses.push("not near support");
    if (input.stochastic <= 75 && nearResistance) misses.push("SO not overbought");
    if (!nearResistance && input.stochastic > 75) misses.push("not near resistance");
    if (!soNeutral && betweenSr) misses.push("SO not neutral");
    if (betweenSr && soNeutral && !trendNeutral) {
      misses.push("trend not neutral");
    }
    if (!betweenSr && !bullish && input.stochastic <= 75) {
      misses.push("no clear setup");
    }
    ruleReason = misses.length > 0 ? misses.join("; ") : ruleReason;
  }

  const strategyFitScore = computeStrategyFitScore({
    systems: input,
    recommendation: ruleRecommendation,
  });

  if (strategyFitScore < STRATEGY_FIT_MIN) {
    const reason =
      ruleRecommendation === "No Trade" &&
      ruleReason !== "Main system rules not met"
        ? ruleReason
        : "Strategy Fit Score below minimum threshold";

    return {
      recommendation: "No Trade",
      strategyFitScore,
      tier: strategyFitTier(strategyFitScore),
      reason,
    };
  }

  return {
    recommendation: ruleRecommendation,
    strategyFitScore,
    tier: strategyFitTier(strategyFitScore),
    reason: ruleReason,
  };
}
