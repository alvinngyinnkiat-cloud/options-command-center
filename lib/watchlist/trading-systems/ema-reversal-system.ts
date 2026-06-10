import type {
  EmaReversalSystemResult,
  EmaScoreTier,
  TradingSystemsInput,
} from "./types";
import {
  buildAdjustedSupportResistanceLevels,
} from "@/lib/watchlist/support-resistance-atr";
import {
  classifyStochasticMomentum,
  emaSystemStochasticScore,
  isCallMomentumConfirmed,
  isPutMomentumConfirmed,
} from "@/lib/watchlist/stochastic-momentum";
import {
  clampScore,
  isNearResistanceZone,
  isNearSupportZone,
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

function isNearPriceLevel(
  price: number,
  level: number,
  atr14: number
): boolean {
  if (atr14 > 0) return Math.abs(price - level) <= atr14;
  if (level === 0) return false;
  return Math.abs((price - level) / level) * 100 <= 2.5;
}

/** Step 1 — S/R base signal using manual and ATR-adjusted levels. */
export function computeBaseSrSignal(input: TradingSystemsInput): {
  baseSrSignal: BaseSrSignal;
  nearSupport: boolean;
  nearResistance: boolean;
} {
  const { support, resistance } = resolveSupportResistance(input);

  if (support == null && resistance == null) {
    return { baseSrSignal: "No Trade", nearSupport: false, nearResistance: false };
  }

  const nearSupportZone =
    support != null &&
    resistance != null &&
    isNearSupportZone(input.averagePrice, support, resistance);

  const nearResistanceZone =
    support != null &&
    resistance != null &&
    isNearResistanceZone(input.averagePrice, support, resistance);

  const adjusted =
    support != null && resistance != null && input.atr14 > 0
      ? buildAdjustedSupportResistanceLevels(
          support,
          resistance,
          input.atr14
        )
      : null;

  const nearRawSupport =
    support != null && isNearPriceLevel(input.averagePrice, support, input.atr14);
  const nearAdjSupport =
    adjusted != null &&
    isNearPriceLevel(
      input.averagePrice,
      adjusted.adjustedSupport,
      input.atr14
    );

  const nearRawResistance =
    resistance != null &&
    isNearPriceLevel(input.averagePrice, resistance, input.atr14);
  const nearAdjResistance =
    adjusted != null &&
    isNearPriceLevel(
      input.averagePrice,
      adjusted.adjustedResistance,
      input.atr14
    );

  const nearSupport =
    nearSupportZone || nearRawSupport || nearAdjSupport;
  const nearResistance =
    nearResistanceZone || nearRawResistance || nearAdjResistance;

  if (nearSupport && !nearResistance) {
    return { baseSrSignal: "Sell Put", nearSupport: true, nearResistance: false };
  }
  if (nearResistance && !nearSupport) {
    return { baseSrSignal: "Sell Call", nearSupport: false, nearResistance: true };
  }
  if (nearSupport && nearResistance) {
    const { support: s, resistance: r } = resolveSupportResistance(input);
    const mid =
      s != null && r != null ? (s + r) / 2 : input.averagePrice;
    if (input.averagePrice <= mid) {
      return { baseSrSignal: "Sell Put", nearSupport: true, nearResistance: true };
    }
    return { baseSrSignal: "Sell Call", nearSupport: true, nearResistance: true };
  }

  return { baseSrSignal: "No Trade", nearSupport: false, nearResistance: false };
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

  const { baseSrSignal, nearSupport, nearResistance } =
    computeBaseSrSignal(input);

  const momentumStatus = classifyStochasticMomentum(
    input.stochastic,
    input.previousStochastic
  );
  const putMomentumOk = isPutMomentumConfirmed(momentumStatus);
  const callMomentumOk = isCallMomentumConfirmed(momentumStatus);

  const putEmaOk = isPutEmaConfirmation(differencePct);
  const callEmaOk = isCallEmaConfirmation(differencePct);

  let recommendation: EmaReversalSystemResult["recommendation"] = "No Trade";
  let reason = "No S/R base signal";

  if (baseSrSignal === "Sell Put" && putEmaOk && putMomentumOk) {
    recommendation = "Sell Put";
    reason = "S/R base Sell Put, EMA timing confirmed, momentum confirmed";
  } else if (baseSrSignal === "Sell Call" && callEmaOk && callMomentumOk) {
    recommendation = "Sell Call";
    reason = "S/R base Sell Call, EMA timing confirmed, momentum confirmed";
  } else {
    const misses: string[] = [];
    if (baseSrSignal === "No Trade") misses.push("not near S/R");
    if (baseSrSignal === "Sell Put") {
      if (!putEmaOk) {
        misses.push(
          `EMA % ${differencePct?.toFixed(2) ?? "—"} outside put bands (0–${PUT_EMA_UPPER_BAND_PCT}% or <${PUT_EMA_DEEP_BELOW_PCT}%)`
        );
      }
      if (!putMomentumOk) misses.push("momentum not confirmed for put");
    }
    if (baseSrSignal === "Sell Call") {
      if (!callEmaOk) {
        misses.push(
          `EMA % ${differencePct?.toFixed(2) ?? "—"} outside call bands (${CALL_EMA_LOWER_BAND_PCT}–0% or >${CALL_EMA_DEEP_ABOVE_PCT}%)`
        );
      }
      if (!callMomentumOk) misses.push("momentum not confirmed for call");
    }
    reason = misses.length > 0 ? misses.join("; ") : reason;
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
    emaDifference: difference,
    emaDifferencePct: differencePct,
    momentumStatus,
  };

  if (emaScore < EMA_SCORE_MIN) {
    return {
      ...result,
      recommendation: "No Trade",
      tier: emaScoreTier(emaScore),
      reason: "EMA Score below minimum threshold",
    };
  }

  return result;
}
