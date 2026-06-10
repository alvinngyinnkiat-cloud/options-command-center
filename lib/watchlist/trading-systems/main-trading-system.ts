import type {
  MainTradingSystemResult,
  StrategyFitTier,
  TradingSystemsInput,
} from "./types";
import {
  clampScore,
  isBetweenSupportAndResistance,
  isBullishTrend,
  isNearResistanceZone,
  isNearSupportZone,
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

function computeStrategyFitScore(input: {
  systems: TradingSystemsInput;
  recommendation: MainTradingSystemResult["recommendation"];
}): number {
  const { systems, recommendation } = input;
  const { support, resistance } = resolveSupportResistance(systems);

  if (recommendation === "No Trade") {
    let partial = 0;
    if (isNearSupportZone(systems.averagePrice, support, resistance)) partial += 10;
    if (isNearResistanceZone(systems.averagePrice, support, resistance)) partial += 10;
    if (systems.stochastic >= 40 && systems.stochastic <= 60) partial += 8;
    return clampScore(partial);
  }

  let score = 45;

  if (recommendation === "Sell Put") {
    if (isBullishTrend(systems)) score += 20;
    if (systems.stochastic < 25) score += 15;
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
    if (systems.stochastic > 75) score += 15;
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
    if (isBetweenSupportAndResistance(systems.averagePrice, support, resistance)) {
      score += 20;
    }
    if (systems.stochastic >= 40 && systems.stochastic <= 60) score += 15;
    if (support != null && resistance != null && systems.atr14 > 0) {
      const rangeAtr = (resistance - support) / systems.atr14;
      score += Math.min(20, rangeAtr * 4);
      const distSupport =
        support > 0 ? Math.abs(systems.averagePrice - support) / systems.atr14 : 0;
      const distResistance =
        resistance > 0
          ? Math.abs(resistance - systems.averagePrice) / systems.atr14
          : 0;
      score += Math.min(10, (distSupport + distResistance) * 2);
    }
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

  let ruleRecommendation: MainTradingSystemResult["recommendation"] = "No Trade";
  let ruleReason = "Main system rules not met";

  if (bullish && input.stochastic < 25 && nearSupport) {
    ruleRecommendation = "Sell Put";
    ruleReason = "Bullish trend, SO < 25, near support";
  } else if (input.stochastic > 75 && nearResistance) {
    ruleRecommendation = "Sell Call";
    ruleReason = "SO > 75, near resistance";
  } else if (betweenSr && soNeutral) {
    ruleRecommendation = "Iron Condor";
    ruleReason = "Between support/resistance, SO 40–60";
  } else {
    const misses: string[] = [];
    if (bullish && input.stochastic >= 25) misses.push("SO not oversold");
    if (!nearSupport && bullish) misses.push("not near support");
    if (input.stochastic <= 75 && nearResistance) misses.push("SO not overbought");
    if (!nearResistance && input.stochastic > 75) misses.push("not near resistance");
    if (!soNeutral && betweenSr) misses.push("SO not neutral");
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
    return {
      recommendation: "No Trade",
      strategyFitScore,
      tier: strategyFitTier(strategyFitScore),
      reason: "Strategy Fit Score below minimum threshold",
    };
  }

  return {
    recommendation: ruleRecommendation,
    strategyFitScore,
    tier: strategyFitTier(strategyFitScore),
    reason: ruleReason,
  };
}
