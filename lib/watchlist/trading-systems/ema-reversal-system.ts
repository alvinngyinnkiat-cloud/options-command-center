import type {
  EmaReversalSystemResult,
  EmaScoreTier,
  TradingSystemsInput,
} from "./types";
import {
  clampScore,
  isAboveOrNearEma20,
  isBelowOrNearEma20,
  isNearResistanceZone,
  isNearSupportZone,
  isStochasticTurningDown,
  isStochasticTurningUp,
  isBullishTrend,
  isBearishTrend,
  resolveSupportResistance,
  srZoneScore,
} from "./shared";

function emaScoreTier(score: number): EmaScoreTier {
  if (score >= 90) return "Strong Reversal";
  if (score >= 75) return "Good Reversal";
  if (score >= 60) return "Watchlist";
  return "Ignore";
}

function computeEmaReversalScore(input: {
  systems: TradingSystemsInput;
  recommendation: EmaReversalSystemResult["recommendation"];
  nearSupport: boolean;
  nearResistance: boolean;
  emaAligned: boolean;
  stochasticConfirmed: boolean;
}): number {
  const { systems, recommendation, nearSupport, nearResistance, emaAligned, stochasticConfirmed } =
    input;
  const { support, resistance } = resolveSupportResistance(systems);

  if (recommendation === "No Trade") {
    let partial = 0;
    if (nearSupport || nearResistance) partial += 15;
    if (emaAligned) partial += 15;
    if (stochasticConfirmed) partial += 15;
    return clampScore(partial);
  }

  let score = 40;
  if (emaAligned) score += 20;
  if (stochasticConfirmed) score += 20;

  if (recommendation === "Sell Put") {
    score += srZoneScore(
      systems.averagePrice,
      support,
      resistance,
      systems.atr14,
      "put"
    );
    if (isBullishTrend(systems)) score += 10;
  } else if (recommendation === "Sell Call") {
    score += srZoneScore(
      systems.averagePrice,
      support,
      resistance,
      systems.atr14,
      "call"
    );
    if (isBearishTrend(systems)) score += 10;
  }

  const emaDistance = Math.abs(
    ((systems.averagePrice - systems.ema20) / systems.ema20) * 100
  );
  score += Math.max(0, 10 - emaDistance);

  return clampScore(score);
}

/** System 1 — 20 EMA reversal (early setups). Never outputs Iron Condor. */
export function computeEmaReversalSystem(
  input: TradingSystemsInput
): EmaReversalSystemResult {
  const { support, resistance } = resolveSupportResistance(input);

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

  const putEmaOk = isBelowOrNearEma20(input.averagePrice, input.ema20);
  const callEmaOk = isAboveOrNearEma20(input.averagePrice, input.ema20);
  const soUp = isStochasticTurningUp(
    input.stochastic,
    input.previousStochastic
  );
  const soDown = isStochasticTurningDown(
    input.stochastic,
    input.previousStochastic
  );

  let recommendation: EmaReversalSystemResult["recommendation"] = "No Trade";
  let reason = "Not near S/R or stochastic not confirming";

  if (nearSupport && putEmaOk && soUp) {
    recommendation = "Sell Put";
    reason =
      "Avg price near support/mid-support, below/near EMA20, stochastic turning up";
  } else if (nearResistance && callEmaOk && soDown) {
    recommendation = "Sell Call";
    reason =
      "Avg price near resistance/mid-resistance, above/near EMA20, stochastic turning down";
  } else {
    const misses: string[] = [];
    if (!nearSupport && !nearResistance) misses.push("not near S/R");
    if (nearSupport && !putEmaOk) misses.push("EMA20 not below/near");
    if (nearResistance && !callEmaOk) misses.push("EMA20 not above/near");
    if (nearSupport && !soUp) misses.push("SO not turning up");
    if (nearResistance && !soDown) misses.push("SO not turning down");
    reason = misses.length > 0 ? misses.join("; ") : reason;
  }

  const emaScore = computeEmaReversalScore({
    systems: input,
    recommendation,
    nearSupport,
    nearResistance,
    emaAligned:
      (recommendation === "Sell Put" && putEmaOk) ||
      (recommendation === "Sell Call" && callEmaOk),
    stochasticConfirmed:
      (recommendation === "Sell Put" && soUp) ||
      (recommendation === "Sell Call" && soDown),
  });

  return {
    recommendation,
    emaScore,
    tier: emaScoreTier(emaScore),
    reason,
  };
}
