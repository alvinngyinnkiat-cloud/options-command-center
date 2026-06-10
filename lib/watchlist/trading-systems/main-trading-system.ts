import type {
  MainScoreTier,
  MainTradingSystemResult,
  TradingSystemsInput,
} from "./types";
import {
  clampScore,
  isBearishTrend,
  isBetweenSupportAndResistance,
  isBullishTrend,
  isNearResistanceZone,
  isNearSupportZone,
  resolveSupportResistance,
  srZoneScore,
} from "./shared";

function mainScoreTier(score: number): MainScoreTier {
  if (score >= 90) return "A+ Setup";
  if (score >= 80) return "A Setup";
  if (score >= 70) return "B Setup";
  return "Pass";
}

function computeMainTradingScore(input: {
  systems: TradingSystemsInput;
  recommendation: MainTradingSystemResult["recommendation"];
}): number {
  const { systems, recommendation } = input;
  const { support, resistance } = resolveSupportResistance(systems);

  if (recommendation === "No Trade") {
    let partial = 0;
    if (isBullishTrend(systems)) partial += 12;
    if (isBearishTrend(systems)) partial += 12;
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
  } else if (recommendation === "Sell Call") {
    if (isBearishTrend(systems)) score += 20;
    if (systems.stochastic > 75) score += 15;
    score += srZoneScore(
      systems.averagePrice,
      support,
      resistance,
      systems.atr14,
      "call"
    );
  } else if (recommendation === "Iron Condor") {
    if (isBetweenSupportAndResistance(systems.averagePrice, support, resistance)) {
      score += 20;
    }
    if (systems.stochastic >= 40 && systems.stochastic <= 60) score += 15;
    if (support != null && resistance != null && systems.atr14 > 0) {
      const rangeAtr = (resistance - support) / systems.atr14;
      score += Math.min(20, rangeAtr * 4);
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
  const bearish = isBearishTrend(input);
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

  let recommendation: MainTradingSystemResult["recommendation"] = "No Trade";
  let reason = "Main system rules not met";

  if (bullish && input.stochastic < 25 && nearSupport) {
    recommendation = "Sell Put";
    reason = "Bullish trend, SO < 25, near support";
  } else if (bearish && input.stochastic > 75 && nearResistance) {
    recommendation = "Sell Call";
    reason = "Bearish setup, SO > 75, near resistance";
  } else if (betweenSr && soNeutral) {
    recommendation = "Iron Condor";
    reason = "Between support/resistance, SO 40–60";
  } else {
    const misses: string[] = [];
    if (!bullish && !bearish && !betweenSr) misses.push("no clear trend/range");
    if (bullish && input.stochastic >= 25) misses.push("SO not oversold");
    if (bearish && input.stochastic <= 75) misses.push("SO not overbought");
    if (!nearSupport && bullish) misses.push("not near support");
    if (!nearResistance && bearish) misses.push("not near resistance");
    if (!soNeutral && betweenSr) misses.push("SO not neutral");
    reason = misses.length > 0 ? misses.join("; ") : reason;
  }

  const mainScore = computeMainTradingScore({ systems: input, recommendation });

  return {
    recommendation,
    mainScore,
    tier: mainScoreTier(mainScore),
    reason,
  };
}
