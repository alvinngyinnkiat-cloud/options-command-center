import type {
  EmaReversalSystemResult,
  EmaScoreTier,
  TradingSystemsInput,
} from "./types";
import {
  calculateAdjustedResistance,
  calculateAdjustedSupport,
} from "@/lib/watchlist/support-resistance-atr";
import {
  classifyStochasticMomentum,
  emaSystemStochasticScore,
  isEmaCallStochasticConfirmed,
  isEmaPutStochasticConfirmed,
} from "@/lib/watchlist/stochastic-momentum";
import {
  clampScore,
  resolveSupportResistance,
  srZoneScore,
} from "./shared";

const EMA_SCORE_MIN = 75;

/** Sell Put: avg at/slightly above EMA, or deeply below. */
const PUT_EMA_UPPER_BAND_PCT = 2.5;
const PUT_EMA_DEEP_BELOW_PCT = -7.5;

/** Sell Call: avg at/slightly below EMA, or well above. */
const CALL_EMA_LOWER_BAND_PCT = -2.5;
const CALL_EMA_DEEP_ABOVE_PCT = 7.5;

export type BaseSrSignal = "Sell Put" | "Sell Call" | "No Trade";

export interface BaseSrSignalResult {
  baseSrSignal: BaseSrSignal;
  baseSrReason: string;
  nearSupport: boolean;
  nearResistance: boolean;
  support: number | null;
  adjustedSupport: number | null;
  resistance: number | null;
  adjustedResistance: number | null;
}

function emaScoreTier(score: number): EmaScoreTier {
  if (score >= 90) return "Elite Reversal";
  if (score >= 85) return "Strong Reversal";
  if (score >= 80) return "Good Reversal";
  if (score >= 75) return "Tradable Reversal";
  return "No Trade";
}

export function computeEmaDifference(
  averagePrice: number,
  ema20: number
): { difference: number; differencePct: number | null } {
  if (ema20 <= 0) return { difference: 0, differencePct: null };
  const difference = averagePrice - ema20;
  return {
    difference,
    differencePct: (difference / ema20) * 100,
  };
}

export function isPutEmaConfirmation(differencePct: number | null): boolean {
  if (differencePct == null) return false;
  return (
    (differencePct >= 0 && differencePct <= PUT_EMA_UPPER_BAND_PCT) ||
    differencePct < PUT_EMA_DEEP_BELOW_PCT
  );
}

export function isCallEmaConfirmation(differencePct: number | null): boolean {
  if (differencePct == null) return false;
  return (
    (differencePct <= 0 && differencePct >= CALL_EMA_LOWER_BAND_PCT) ||
    differencePct > CALL_EMA_DEEP_ABOVE_PCT
  );
}

/** Support zone: Support ≤ Average Price ≤ Support + ATR. */
export function isInStrictSupportZone(
  averagePrice: number,
  support: number,
  atr14: number
): boolean {
  if (atr14 <= 0) return false;
  const adjustedSupport = calculateAdjustedSupport(support, atr14);
  return averagePrice >= support && averagePrice <= adjustedSupport;
}

/** Resistance zone: Resistance − ATR ≤ Average Price ≤ Resistance. */
export function isInStrictResistanceZone(
  averagePrice: number,
  resistance: number,
  atr14: number
): boolean {
  if (atr14 <= 0) return false;
  const adjustedResistance = calculateAdjustedResistance(resistance, atr14);
  return averagePrice >= adjustedResistance && averagePrice <= resistance;
}

/** Step 1 — strict S/R zones only (no midpoint or loose proximity). */
export function computeBaseSrSignal(input: TradingSystemsInput): BaseSrSignalResult {
  const { support, resistance } = resolveSupportResistance(input);
  const atr14 = input.atr14;

  const adjustedSupport =
    support != null && atr14 > 0
      ? calculateAdjustedSupport(support, atr14)
      : null;
  const adjustedResistance =
    resistance != null && atr14 > 0
      ? calculateAdjustedResistance(resistance, atr14)
      : null;

  const inSupportZone =
    support != null &&
    adjustedSupport != null &&
    isInStrictSupportZone(input.averagePrice, support, atr14);

  const inResistanceZone =
    resistance != null &&
    adjustedResistance != null &&
    isInStrictResistanceZone(input.averagePrice, resistance, atr14);

  if (support == null && resistance == null) {
    return {
      baseSrSignal: "No Trade",
      baseSrReason: "Support/resistance levels not configured",
      nearSupport: false,
      nearResistance: false,
      support: null,
      adjustedSupport: null,
      resistance: null,
      adjustedResistance: null,
    };
  }

  if (inSupportZone && inResistanceZone) {
    return {
      baseSrSignal: "No Trade",
      baseSrReason:
        "Average Price in both support and resistance zones — ambiguous",
      nearSupport: true,
      nearResistance: true,
      support,
      adjustedSupport,
      resistance,
      adjustedResistance,
    };
  }

  if (inSupportZone) {
    return {
      baseSrSignal: "Sell Put",
      baseSrReason: `Average Price in support zone (${support!.toFixed(2)}–${adjustedSupport!.toFixed(2)})`,
      nearSupport: true,
      nearResistance: false,
      support,
      adjustedSupport,
      resistance,
      adjustedResistance,
    };
  }

  if (inResistanceZone) {
    return {
      baseSrSignal: "Sell Call",
      baseSrReason: `Average Price in resistance zone (${adjustedResistance!.toFixed(2)}–${resistance!.toFixed(2)})`,
      nearSupport: false,
      nearResistance: true,
      support,
      adjustedSupport,
      resistance,
      adjustedResistance,
    };
  }

  return {
    baseSrSignal: "No Trade",
    baseSrReason: "Average Price outside support/resistance zone",
    nearSupport: false,
    nearResistance: false,
    support,
    adjustedSupport,
    resistance,
    adjustedResistance,
  };
}

function momentumScoreForEmaSystem(input: {
  recommendation: EmaReversalSystemResult["recommendation"];
  baseSrSignal: BaseSrSignal;
  momentum: ReturnType<typeof classifyStochasticMomentum>;
}): number {
  if (input.recommendation === "Sell Put") {
    return emaSystemStochasticScore("Sell Put", input.momentum);
  }
  if (input.recommendation === "Sell Call") {
    return emaSystemStochasticScore("Sell Call", input.momentum);
  }
  if (input.baseSrSignal === "Sell Put") {
    return emaSystemStochasticScore("Sell Put", input.momentum);
  }
  if (input.baseSrSignal === "Sell Call") {
    return emaSystemStochasticScore("Sell Call", input.momentum);
  }
  return 0;
}

function computeEmaReversalScore(input: {
  systems: TradingSystemsInput;
  recommendation: EmaReversalSystemResult["recommendation"];
  baseSrSignal: BaseSrSignal;
  emaConfirmed: boolean;
  momentumScore: number;
  nearSupport: boolean;
  nearResistance: boolean;
}): number {
  const { systems, recommendation, emaConfirmed, momentumScore } = input;
  const { support, resistance } = resolveSupportResistance(systems);

  if (recommendation === "No Trade") {
    let partial = 0;
    if (input.baseSrSignal !== "No Trade") partial += 20;
    if (emaConfirmed) partial += 15;
    partial += momentumScore;
    if (input.nearSupport || input.nearResistance) partial += 10;
    return clampScore(partial);
  }

  let score = 35;
  if (input.baseSrSignal === recommendation) score += 20;
  if (emaConfirmed) score += 20;
  score += momentumScore;

  if (recommendation === "Sell Put") {
    score += srZoneScore(
      systems.averagePrice,
      support,
      resistance,
      systems.atr14,
      "put"
    );
  } else if (recommendation === "Sell Call") {
    score += srZoneScore(
      systems.averagePrice,
      support,
      resistance,
      systems.atr14,
      "call"
    );
  }

  const emaDistance = Math.abs(
    computeEmaDifference(systems.averagePrice, systems.ema20).differencePct ?? 0
  );
  score += Math.max(0, 10 - Math.min(10, emaDistance));

  return clampScore(score);
}

/** System 1 — 20 EMA shorter-DTE reversal. S/R first, EMA20 timing, SO direction. */
export function computeEmaReversalSystem(
  input: TradingSystemsInput
): EmaReversalSystemResult {
  const { difference, differencePct } = computeEmaDifference(
    input.averagePrice,
    input.ema20
  );

  const baseSr = computeBaseSrSignal(input);
  const {
    baseSrSignal,
    baseSrReason,
    nearSupport,
    nearResistance,
    support,
    adjustedSupport,
    resistance,
    adjustedResistance,
  } = baseSr;

  const momentumStatus = classifyStochasticMomentum(
    input.stochastic,
    input.previousStochastic
  );
  const putStochasticOk = isEmaPutStochasticConfirmed(
    momentumStatus,
    input.stochastic
  );
  const callStochasticOk = isEmaCallStochasticConfirmed(
    momentumStatus,
    input.stochastic
  );

  const putEmaOk = isPutEmaConfirmation(differencePct);
  const callEmaOk = isCallEmaConfirmation(differencePct);

  let recommendation: EmaReversalSystemResult["recommendation"] = "No Trade";
  let reason = baseSrReason;

  if (baseSrSignal === "Sell Put" && putEmaOk && putStochasticOk) {
    recommendation = "Sell Put";
    reason =
      "S/R base Sell Put, EMA timing confirmed, rolling up or SO oversold";
  } else if (baseSrSignal === "Sell Call" && callEmaOk && callStochasticOk) {
    recommendation = "Sell Call";
    reason =
      "S/R base Sell Call, EMA timing confirmed, rolling down or SO overbought";
  } else if (baseSrSignal === "No Trade") {
    reason = baseSrReason;
  } else {
    const misses: string[] = [];
    if (baseSrSignal === "Sell Put") {
      if (!putEmaOk) {
        misses.push(
          `EMA % ${differencePct?.toFixed(2) ?? "—"} outside put bands (0–${PUT_EMA_UPPER_BAND_PCT}% or <${PUT_EMA_DEEP_BELOW_PCT}%)`
        );
      }
      if (!putStochasticOk) {
        misses.push("SO not rolling up and SO not below 25");
      }
    }
    if (baseSrSignal === "Sell Call") {
      if (!callEmaOk) {
        misses.push(
          `EMA % ${differencePct?.toFixed(2) ?? "—"} outside call bands (${CALL_EMA_LOWER_BAND_PCT}–0% or >${CALL_EMA_DEEP_ABOVE_PCT}%)`
        );
      }
      if (!callStochasticOk) {
        misses.push("SO not rolling down and SO not above 75");
      }
    }
    reason = misses.length > 0 ? misses.join("; ") : baseSrReason;
  }

  const emaConfirmed =
    (baseSrSignal === "Sell Put" && putEmaOk) ||
    (baseSrSignal === "Sell Call" && callEmaOk);

  const momentumScore = momentumScoreForEmaSystem({
    recommendation,
    baseSrSignal,
    momentum: momentumStatus,
  });

  const emaScore = computeEmaReversalScore({
    systems: input,
    recommendation,
    baseSrSignal,
    emaConfirmed,
    momentumScore,
    nearSupport,
    nearResistance,
  });

  const result: EmaReversalSystemResult = {
    recommendation,
    emaScore,
    tier: emaScoreTier(emaScore),
    reason,
    baseSrSignal,
    baseSrReason,
    support,
    adjustedSupport,
    resistance,
    adjustedResistance,
    emaDifference: difference,
    emaDifferencePct: differencePct,
    momentumStatus,
  };

  if (emaScore < EMA_SCORE_MIN) {
    return {
      ...result,
      recommendation: "No Trade",
      tier: emaScoreTier(emaScore),
      reason:
        recommendation === "No Trade"
          ? reason
          : "EMA Score below minimum threshold",
    };
  }

  return result;
}
