import type { IntelligenceLayer } from "@/lib/market-intelligence/types";
import type { StrategyRecommendation } from "@/lib/watchlist/recommendation/types";
import type { ComputedScore, DecisionLabel } from "@/lib/watchlist/scoring/types";
import type { TradingSystemsResult } from "@/lib/watchlist/trading-systems";

/** Phase 5 score + Phase 6 recommendation + dual trading systems + intelligence. */
export interface ScannerScoreResult extends ComputedScore {
  /** Independent 20 EMA reversal + main premium-selling + confluence engines. */
  tradingSystems: TradingSystemsResult;
  recommendation: StrategyRecommendation;
  /** Technical score remains primary input for strategy rules (75% weight). */
  intelligence: IntelligenceLayer;
  combinedScore: number;
  combinedDecisionLabel: DecisionLabel;
}
