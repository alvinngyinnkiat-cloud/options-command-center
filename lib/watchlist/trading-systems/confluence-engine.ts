import type {
  ConfluenceResult,
  ConfluenceTier,
  EmaReversalSystemResult,
  MainTradingSystemResult,
} from "./types";
import { recommendationDirection } from "./shared";

function confluenceTier(score: number): ConfluenceTier {
  if (score >= 10) return "Tier 1";
  if (score >= 8) return "Tier 2";
  if (score >= 7) return "Tier 3";
  return "Tier 4";
}

function isConflicting(
  ema: EmaReversalSystemResult,
  main: MainTradingSystemResult
): boolean {
  const eDir = recommendationDirection(ema.recommendation);
  const mDir = recommendationDirection(main.recommendation);
  return (
    (eDir === "bullish" && mDir === "bearish") ||
    (eDir === "bearish" && mDir === "bullish")
  );
}

function directionsAlign(
  ema: EmaReversalSystemResult,
  main: MainTradingSystemResult
): boolean {
  const eDir = recommendationDirection(ema.recommendation);
  const mDir = recommendationDirection(main.recommendation);

  if (eDir === "none" || mDir === "none") return false;
  if (eDir === mDir) return true;

  if (eDir === "bullish" && mDir === "neutral") return true;
  if (eDir === "bearish" && mDir === "neutral") return true;
  if (mDir === "bullish" && eDir === "neutral") return true;
  if (mDir === "bearish" && eDir === "neutral") return true;

  return false;
}

/** System 3 — Confluence between 20 EMA and Main systems (informational only). */
export function computeConfluence(
  ema: EmaReversalSystemResult,
  main: MainTradingSystemResult
): ConfluenceResult {
  const e = ema.recommendation;
  const m = main.recommendation;
  const eTrade = e !== "No Trade";
  const mTrade = m !== "No Trade";

  if (e === m && eTrade) {
    return {
      score: 10,
      status: "STRONG AGREEMENT",
      tier: confluenceTier(10),
      reason: `Both systems agree: ${e}`,
    };
  }

  if (eTrade && !mTrade) {
    return {
      score: 7,
      status: "SHORTER-DTE ONLY",
      tier: confluenceTier(7),
      reason: `20 EMA ${e}; Main on sidelines`,
    };
  }

  if (!eTrade && mTrade) {
    return {
      score: 6,
      status: "MAIN SYSTEM ONLY",
      tier: confluenceTier(6),
      reason: `Main ${m}; 20 EMA on sidelines`,
    };
  }

  if (isConflicting(ema, main)) {
    const severity = Math.min(
      5,
      Math.max(
        0,
        5 -
          Math.floor(
            Math.abs(ema.emaScore - main.strategyFitScore) / 25
          )
      )
    );
    return {
      score: severity,
      status: "CONFLICTING SIGNALS",
      tier: confluenceTier(severity),
      reason: `20 EMA ${e} vs Main ${m}`,
    };
  }

  if (directionsAlign(ema, main) && eTrade && mTrade && e !== m) {
    const avgQuality = (ema.emaScore + main.strategyFitScore) / 2;
    const score = avgQuality >= 85 ? 9 : 8;
    return {
      score,
      status: "GOOD AGREEMENT",
      tier: confluenceTier(score),
      reason: `Aligned direction: 20 EMA ${e}, Main ${m}`,
    };
  }

  if (directionsAlign(ema, main) && (eTrade || mTrade)) {
    return {
      score: 8,
      status: "GOOD AGREEMENT",
      tier: confluenceTier(8),
      reason: "Directional agreement with partial activation",
    };
  }

  if (!eTrade && !mTrade) {
    return {
      score: 5,
      status: "CONFLICTING SIGNALS",
      tier: confluenceTier(5),
      reason: "Both systems: No Trade",
    };
  }

  return {
    score: 5,
    status: "CONFLICTING SIGNALS",
    tier: confluenceTier(5),
    reason: "Systems do not align",
  };
}
