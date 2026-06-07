import { computeScannerScore } from "@/lib/watchlist/scoring/compute";
import {
  BEAR_CALL_PERFECT_FIXTURE,
  BULL_PUT_PERFECT_FIXTURE,
  IRON_CONDOR_PERFECT_FIXTURE,
} from "@/lib/watchlist/scoring/fixtures";
import type { RecommendationInput } from "./types";

function toRecommendationInput(
  fixture: typeof BULL_PUT_PERFECT_FIXTURE
): RecommendationInput {
  const score = computeScannerScore(fixture);
  return {
    averagePrice: fixture.averagePrice,
    stochastic: fixture.technicals.stochastic,
    distanceEma20Pct: fixture.distanceEma20Pct,
    atr14: fixture.technicals.atr14,
    support: fixture.support,
    resistance: fixture.resistance,
    sma50: fixture.technicals.sma50,
    sma200: fixture.technicals.sma200,
    sma50Previous: fixture.technicals.sma50Previous,
    score,
  };
}

export const BULL_PUT_RECOMMENDATION_INPUT = toRecommendationInput(
  BULL_PUT_PERFECT_FIXTURE
);
export const BEAR_CALL_RECOMMENDATION_INPUT = toRecommendationInput(
  BEAR_CALL_PERFECT_FIXTURE
);
export const IRON_CONDOR_RECOMMENDATION_INPUT = toRecommendationInput(
  IRON_CONDOR_PERFECT_FIXTURE
);
