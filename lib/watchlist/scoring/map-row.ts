import { computeCombinedScore } from "@/lib/market-intelligence/combined-score";
import type { AggregatedTickerIntelligence } from "@/lib/market-intelligence/types";
import { resolveIntelligenceLayer } from "@/lib/market-intelligence/resolve-impacts";
import { refreshRowDerivedFields } from "@/lib/watchlist/calculations";
import type { WatchlistScannerRow } from "@/lib/watchlist/types";
import { computeStrategyRecommendation } from "@/lib/watchlist/recommendation";
import type { ScannerScoreResult } from "@/lib/watchlist/scanner-result";
import { calculateEma20DistancePct } from "./ema20";
import { computeScannerScore } from "./compute";

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

  const score = computeScannerScore({
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
  });

  const recommendation = computeStrategyRecommendation({
    averagePrice,
    stochastic: row.technicals.stochastic,
    distanceEma20Pct,
    atr14: row.technicals.atr14,
    support: row.supportResistance.support1,
    resistance: row.supportResistance.resistance1,
    sma50: row.technicals.sma50,
    sma200: row.technicals.sma200,
    sma50Previous: row.previousTechnicals.sma50,
    score,
  });

  const intelligence = resolveIntelligenceLayer(row.ticker, intelligenceMap);
  const combined = computeCombinedScore(score.totalScore, intelligence.score);

  return {
    ...score,
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
