import { computeCombinedScore } from "@/lib/market-intelligence/combined-score";
import type { AggregatedTickerIntelligence } from "@/lib/market-intelligence/types";
import { resolveIntelligenceLayer } from "@/lib/market-intelligence/resolve-impacts";
import { refreshRowDerivedFields } from "@/lib/watchlist/calculations";
import type { WatchlistScannerRow } from "@/lib/watchlist/types";
import type { ScannerScoreResult } from "@/lib/watchlist/scanner-result";
import { calculateEma20DistancePct } from "./ema20";
import { computeScannerScore } from "./compute";
import { decisionToAction } from "./decision";
import {
  strategyFitScoreToDecisionLabel,
  tradingSystemToLegacyLabel,
  tradingSystemToStrategyType,
} from "@/lib/watchlist/trading-systems/legacy-bridge";
import { computeTradingSystems } from "@/lib/watchlist/trading-systems";
import type { StrategyRecommendation } from "@/lib/watchlist/recommendation/types";

/** Scoring and recommendations use Average Price — Current Price is display-only. */
export function scoreWatchlistRow(
  row: WatchlistScannerRow,
  intelligenceMap?: Map<string, AggregatedTickerIntelligence>
): ScannerScoreResult {
  const averagePrice = row.market.averagePrice;
  const distanceEma20Pct = calculateEma20DistancePct(
    averagePrice,
    row.technicals.ema20
  );

  const componentScore = computeScannerScore({
    watchlistId: row.watchlistId,
    ticker: row.ticker,
    averagePrice,
    technicals: {
      ...row.technicals,
      sma50Previous: row.previousTechnicals.sma50,
    },
    distanceEma20Pct,
    support: row.supportResistance.support1,
    resistance: row.supportResistance.resistance1,
    weeklySupport: row.weeklySupportResistance?.support1 ?? null,
    weeklyResistance: row.weeklySupportResistance?.resistance1 ?? null,
  });

  const tradingSystems = computeTradingSystems({
    watchlistId: row.watchlistId,
    ticker: row.ticker,
    averagePrice,
    atr14: row.technicals.atr14,
    ema20: row.technicals.ema20,
    sma50: row.technicals.sma50,
    sma200: row.technicals.sma200,
    sma50Previous: row.previousTechnicals.sma50,
    stochastic: row.technicals.stochastic,
    previousStochastic: row.previousTechnicals.stochastic,
    dailySupport: row.supportResistance.support1,
    dailyResistance: row.supportResistance.resistance1,
    weeklySupport: row.weeklySupportResistance?.support1 ?? null,
    weeklyResistance: row.weeklySupportResistance?.resistance1 ?? null,
    scoreDate: componentScore.scoreDate,
  });

  const { emaSystem, mainSystem, confluence } = tradingSystems;
  const mainLabel = tradingSystemToLegacyLabel(mainSystem.recommendation);
  const mainDecision = strategyFitScoreToDecisionLabel(mainSystem.strategyFitScore);

  const recommendation: StrategyRecommendation = {
    recommendedStrategy: mainLabel,
    recommendedStrategyType: tradingSystemToStrategyType(
      mainSystem.recommendation
    ),
    totalScore: mainSystem.strategyFitScore,
    decisionLabel: mainDecision,
    actionLabel: mainDecision,
    action: decisionToAction(mainDecision),
    passFailExplanation: tradingSystems.decisionReason,
    scoreBreakdown: [
      {
        category: "Trend",
        score: componentScore.trend.score,
        maxScore: componentScore.trend.maxScore,
        passed: componentScore.trend.passed,
        reason: componentScore.trend.reason,
      },
      {
        category: "Stochastic",
        score: componentScore.stochastic.score,
        maxScore: componentScore.stochastic.maxScore,
        passed: componentScore.stochastic.passed,
        reason: componentScore.stochastic.reason,
      },
      {
        category: "S/R",
        score: componentScore.supportResistance.score,
        maxScore: componentScore.supportResistance.maxScore,
        passed: componentScore.supportResistance.passed,
        reason: componentScore.supportResistance.reason,
      },
    ],
    primaryReason: mainSystem.reason,
    warningNotes:
      emaSystem.recommendation !== mainSystem.recommendation &&
      emaSystem.recommendation !== "No Trade"
        ? [
            `20 EMA system: ${emaSystem.recommendation} (${emaSystem.emaScore}) — ${emaSystem.reason}`,
          ]
        : [],
    ruleChecks: [],
    sellPutEligible: mainSystem.recommendation === "Sell Put",
    sellCallEligible: mainSystem.recommendation === "Sell Call",
    sellPutReason:
      mainSystem.recommendation === "Sell Put" ? mainSystem.reason : "",
    sellCallReason:
      mainSystem.recommendation === "Sell Call" ? mainSystem.reason : "",
  };

  const intelligence = resolveIntelligenceLayer(row.ticker, intelligenceMap);
  const combined = computeCombinedScore(
    mainSystem.strategyFitScore,
    intelligence.score
  );

  return {
    ...componentScore,
    totalScore: mainSystem.strategyFitScore,
    decisionLabel: mainDecision,
    action: decisionToAction(mainDecision),
    tradingSystems,
    recommendation,
    intelligence,
    combinedScore: combined.combinedScore,
    combinedDecisionLabel: combined.combinedDecisionLabel,
  };
}

export function attachScoresToRows(
  rows: WatchlistScannerRow[],
  intelligenceMap?: Map<string, AggregatedTickerIntelligence>
): WatchlistScannerRow[] {
  const map = intelligenceMap;
  return rows.map((row) => {
    const refreshed = refreshRowDerivedFields(row);
    return { ...refreshed, score: scoreWatchlistRow(refreshed, map) };
  });
}

/** Sort key: strategy fit → confluence → EMA score. */
export function tradingSystemsSortKey(row: WatchlistScannerRow): number {
  const ts = row.score?.tradingSystems;
  if (!ts) return 0;
  return (
    ts.mainSystem.strategyFitScore * 1_000_000 +
    ts.confluence.score * 1_000 +
    ts.emaSystem.emaScore
  );
}

export function sortRowsByTradingSystems(
  rows: WatchlistScannerRow[]
): WatchlistScannerRow[] {
  return [...rows].sort(
    (a, b) => tradingSystemsSortKey(b) - tradingSystemsSortKey(a)
  );
}
