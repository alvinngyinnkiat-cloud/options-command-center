import { getDecisionLabel } from "@/lib/watchlist/scoring/decision";
import type { DecisionLabel } from "@/lib/watchlist/scoring/types";
import { COMBINED_WEIGHTS, NEUTRAL_INTELLIGENCE_SCORE } from "./constants";
import type { CombinedScoreResult } from "./types";

export function computeCombinedScore(
  technicalScore: number,
  intelligenceScore: number = NEUTRAL_INTELLIGENCE_SCORE
): CombinedScoreResult {
  const combinedScore = Math.round(
    technicalScore * COMBINED_WEIGHTS.technical +
      intelligenceScore * COMBINED_WEIGHTS.intelligence
  );
  const combinedDecisionLabel = getDecisionLabel(combinedScore) as DecisionLabel;

  return {
    technicalScore,
    intelligenceScore,
    combinedScore,
    combinedDecisionLabel,
  };
}
