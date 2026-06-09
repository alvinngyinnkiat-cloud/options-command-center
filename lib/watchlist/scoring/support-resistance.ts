import type { StrategyType } from "@/types/database";
import { scoreBullPutAdjustedZone } from "@/lib/watchlist/support-resistance-atr";
import type { ScoreComponentResult, SupportResistanceScoreInput } from "./types";
import { SCORE_WEIGHTS } from "./types";

export function scoreSupportResistance(
  input: SupportResistanceScoreInput
): ScoreComponentResult {
  const maxScore = SCORE_WEIGHTS.supportResistance;

  if (input.atr14 <= 0) {
    return {
      score: 0,
      maxScore,
      passed: false,
      reason: "ATR14 must be positive for S/R distance scoring",
    };
  }

  switch (input.strategy) {
    case "bull_put_spread":
      return scoreBullPutSr(input, maxScore);
    case "bear_call_spread":
      return scoreBearCallSr(input, maxScore);
    case "iron_condor":
      return scoreIronCondorSr(input, maxScore);
    default:
      return {
        score: 0,
        maxScore,
        passed: false,
        reason: `Unknown strategy: ${input.strategy}`,
      };
  }
}

function averageComponentScores(
  results: ScoreComponentResult[],
  maxScore: number,
  emptyReason: string
): ScoreComponentResult {
  const scored = results.filter((r) => r.score > 0 || r.passed);
  if (scored.length === 0) {
    return (
      results[0] ?? {
        score: 0,
        maxScore,
        passed: false,
        reason: emptyReason,
      }
    );
  }

  const score = Math.round(
    scored.reduce((sum, r) => sum + r.score, 0) / scored.length
  );
  return {
    score: Math.min(maxScore, score),
    maxScore,
    passed: score > 0,
    reason: scored.map((r) => r.reason).join(" · "),
  };
}

function scoreBullPutSr(
  input: SupportResistanceScoreInput,
  maxScore: number
): ScoreComponentResult {
  const results: ScoreComponentResult[] = [];

  const hasDaily =
    input.support != null && input.resistance != null;
  const hasWeekly =
    input.weeklySupport != null && input.weeklyResistance != null;

  if (!hasDaily && !hasWeekly) {
    return {
      score: 0,
      maxScore,
      passed: false,
      reason: "Manual support and resistance required — never auto-generated",
    };
  }

  if (hasDaily) {
    const zone = scoreBullPutAdjustedZone(
      input.averagePrice,
      input.support!,
      input.resistance!,
      input.atr14,
      maxScore,
      "Daily S/R"
    );
    results.push({ ...zone, maxScore });
  }

  if (hasWeekly) {
    const zone = scoreBullPutAdjustedZone(
      input.averagePrice,
      input.weeklySupport!,
      input.weeklyResistance!,
      input.atr14,
      maxScore,
      "Weekly S/R"
    );
    results.push({ ...zone, maxScore });
  }

  return averageComponentScores(
    results,
    maxScore,
    "Manual support and resistance required — never auto-generated"
  );
}

function scoreBearCallSr(
  input: SupportResistanceScoreInput,
  maxScore: number
): ScoreComponentResult {
  const results: ScoreComponentResult[] = [];

  if (input.resistance == null && input.weeklyResistance == null) {
    return {
      score: 0,
      maxScore,
      passed: false,
      reason: "Manual resistance required — never auto-generated",
    };
  }

  if (input.resistance != null) {
    const atrDistance = (input.resistance - input.averagePrice) / input.atr14;
    results.push(
      scoreAtrDistance(atrDistance, maxScore, "daily resistance", "Bear Call")
    );
  }

  if (input.weeklyResistance != null) {
    const atrDistance =
      (input.weeklyResistance - input.averagePrice) / input.atr14;
    results.push(
      scoreAtrDistance(atrDistance, maxScore, "weekly resistance", "Bear Call")
    );
  }

  return averageComponentScores(
    results,
    maxScore,
    "Manual resistance required — never auto-generated"
  );
}

function scoreIronCondorRange(
  support: number,
  resistance: number,
  atr14: number,
  maxScore: number,
  label: string
): ScoreComponentResult {
  const rangeAtr = (resistance - support) / atr14;

  if (rangeAtr > 4) {
    return {
      score: maxScore,
      maxScore,
      passed: true,
      reason: `${label} range ${rangeAtr.toFixed(2)} ATR > 4`,
    };
  }
  if (rangeAtr >= 3 && rangeAtr <= 4) {
    return {
      score: 16,
      maxScore,
      passed: true,
      reason: `${label} range ${rangeAtr.toFixed(2)} ATR in 3–4`,
    };
  }
  return {
    score: 0,
    maxScore,
    passed: false,
    reason: `${label} range ${rangeAtr.toFixed(2)} ATR < 3`,
  };
}

function scoreIronCondorSr(
  input: SupportResistanceScoreInput,
  maxScore: number
): ScoreComponentResult {
  const results: ScoreComponentResult[] = [];

  const hasDaily =
    input.support != null && input.resistance != null;
  const hasWeekly =
    input.weeklySupport != null && input.weeklyResistance != null;

  if (!hasDaily && !hasWeekly) {
    return {
      score: 0,
      maxScore,
      passed: false,
      reason: "Manual support and resistance required — never auto-generated",
    };
  }

  if (hasDaily) {
    results.push(
      scoreIronCondorRange(
        input.support!,
        input.resistance!,
        input.atr14,
        maxScore,
        "Daily S/R"
      )
    );
  }

  if (hasWeekly) {
    results.push(
      scoreIronCondorRange(
        input.weeklySupport!,
        input.weeklyResistance!,
        input.atr14,
        maxScore,
        "Weekly S/R"
      )
    );
  }

  return averageComponentScores(
    results,
    maxScore,
    "Manual support and resistance required — never auto-generated"
  );
}

function scoreAtrDistance(
  atrDistance: number,
  maxScore: number,
  level: string,
  strategyLabel: string
): ScoreComponentResult {
  if (atrDistance < 0) {
    return {
      score: 0,
      maxScore,
      passed: false,
      reason: `Avg price beyond ${level} — negative ATR distance`,
    };
  }

  if (atrDistance < 1) {
    return {
      score: maxScore,
      maxScore,
      passed: true,
      reason: `${strategyLabel}: ${atrDistance.toFixed(2)} ATR from ${level} (< 1)`,
    };
  }
  if (atrDistance >= 1 && atrDistance < 2) {
    return {
      score: 16,
      maxScore,
      passed: true,
      reason: `${strategyLabel}: ${atrDistance.toFixed(2)} ATR from ${level} (1–2)`,
    };
  }
  if (atrDistance >= 2 && atrDistance <= 3) {
    return {
      score: 8,
      maxScore,
      passed: true,
      reason: `${strategyLabel}: ${atrDistance.toFixed(2)} ATR from ${level} (2–3)`,
    };
  }
  return {
    score: 0,
    maxScore,
    passed: false,
    reason: `${strategyLabel}: ${atrDistance.toFixed(2)} ATR from ${level} (> 3)`,
  };
}
