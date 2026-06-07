export { computeScannerScore } from "./compute";
export { calculateEma20DistancePct, scoreEma20Distance } from "./ema20";
export { scoreStochastic } from "./stochastic";
export { scoreSupportResistance } from "./support-resistance";
export { scoreTrend } from "./trend";
export {
  detectCandidateStrategy,
  isBullPutCandidate,
  isBearCallCandidate,
  isIronCondorCandidate,
} from "./candidate";
export {
  getDecisionLabel,
  decisionToAction,
  formatStrategyLabel,
} from "./decision";
export type {
  ComputedScore,
  DecisionLabel,
  ScannerScoringInput,
  ScoreComponentResult,
} from "./types";
export type { ScannerScoreResult } from "@/lib/watchlist/scanner-result";
export { SCORE_WEIGHTS } from "./types";
