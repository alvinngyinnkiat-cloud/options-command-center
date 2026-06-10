import type {
  ConfluenceResult,
  ConfluenceStatus,
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

/** System 3 — Confluence between 20 EMA and Main systems. */
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
      status: "STRONG CONFLUENCE",
      tier: confluenceTier(10),
      reason: `Both systems agree: ${e}`,
    };
  }

  if (e === "No Trade" && m === "Iron Condor") {
    return {
      score: 6,
      status: "NEUTRAL",
      tier: confluenceTier(6),
      reason: "20 EMA neutral; Main system Iron Condor",
    };
  }

  if (eTrade !== mTrade) {
    const active = eTrade ? e : m;
    return {
      score: 7,
      status: "EARLY SETUP",
      tier: confluenceTier(7),
      reason: `One system active (${active}); other on sidelines`,
    };
  }

  if (isConflicting(ema, main)) {
    const severity = Math.min(
      5,
      Math.max(
        0,
        5 -
          Math.floor(
            Math.abs(ema.emaScore - main.mainScore) / 25
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
    const avgQuality = (ema.emaScore + main.mainScore) / 2;
    const score = avgQuality >= 85 ? 9 : 8;
    return {
      score,
      status: "GOOD CONFLUENCE",
      tier: confluenceTier(score),
      reason: `Aligned direction: 20 EMA ${e}, Main ${m}`,
    };
  }

  if (directionsAlign(ema, main) && (eTrade || mTrade)) {
    return {
      score: 8,
      status: "GOOD CONFLUENCE",
      tier: confluenceTier(8),
      reason: `Directional agreement with partial activation`,
    };
  }

  return {
    score: 5,
    status: "CONFLICTING SIGNALS",
    tier: confluenceTier(5),
    reason: "Systems do not align",
  };
}
