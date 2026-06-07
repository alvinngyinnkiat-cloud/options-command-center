import type { IntelligenceLayer } from "@/lib/market-intelligence/types";
import type { StrategyRecommendation } from "@/lib/watchlist/recommendation/types";
import type { ComputedScore, DecisionLabel } from "@/lib/watchlist/scoring/types";

/** Phase 5 score + Phase 6 recommendation + Phase 14 intelligence layer. */
export interface ScannerScoreResult extends ComputedScore {
  recommendation: StrategyRecommendation;
  /** Technical score remains primary input for strategy rules (75% weight). */
  intelligence: IntelligenceLayer;
  combinedScore: number;
  combinedDecisionLabel: DecisionLabel;
}
