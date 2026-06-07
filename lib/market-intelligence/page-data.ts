import type { WatchlistScannerRow } from "@/lib/watchlist/types";
import { NEUTRAL_INTELLIGENCE_SCORE } from "./constants";
import { sentimentLabel } from "./sentiment";
import type {
  AggregatedTickerIntelligence,
  IntelligenceDocument,
  IntelligenceSummary,
  MarketIntelligencePageData,
  OptionsDecisionRow,
  TickerIntelligenceImpact,
} from "./types";

export function buildAggregatedImpacts(
  impacts: TickerIntelligenceImpact[],
  summaries: IntelligenceSummary[]
): AggregatedTickerIntelligence[] {
  const byTicker = new Map<string, TickerIntelligenceImpact[]>();
  for (const impact of impacts) {
    const list = byTicker.get(impact.ticker) ?? [];
    list.push(impact);
    byTicker.set(impact.ticker, list);
  }

  const summaryByDoc = new Map(summaries.map((s) => [s.documentId, s]));

  return [...byTicker.entries()].map(([ticker, rows]) => {
    const avgScore = Math.round(
      rows.reduce((s, r) => s + r.impactScore, 0) / rows.length
    );
    const avgSentimentScore = Math.round(
      rows.reduce((s, r) => s + r.sentimentScore, 0) / rows.length
    ) as -2 | -1 | 0 | 1 | 2;
    const sentiment =
      avgSentimentScore >= 2
        ? "very_bullish"
        : avgSentimentScore >= 1
          ? "bullish"
          : avgSentimentScore <= -2
            ? "very_bearish"
            : avgSentimentScore <= -1
              ? "bearish"
              : "neutral";

    const docIds = new Set(rows.map((r) => r.documentId).filter(Boolean));
    const relatedSummaries = [...docIds]
      .map((id) => summaryByDoc.get(id!))
      .filter(Boolean) as IntelligenceSummary[];

    return {
      ticker,
      score: avgScore,
      sentiment,
      sentimentScore: avgSentimentScore,
      sentimentLabel: sentimentLabel(sentiment),
      rationale: rows[0]?.rationale ?? null,
      sourceCount: rows.length,
      keyTakeaways: relatedSummaries.flatMap((s) => s.keyTakeaways).slice(0, 4),
      bullishSignals: relatedSummaries
        .flatMap((s) => s.bullishSignals)
        .slice(0, 4),
      bearishSignals: relatedSummaries
        .flatMap((s) => s.bearishSignals)
        .slice(0, 4),
    };
  });
}

export function buildOptionsDecisionAssistant(
  scannerRows: WatchlistScannerRow[],
  aggregated: AggregatedTickerIntelligence[]
): OptionsDecisionRow[] {
  const impactByTicker = new Map(aggregated.map((a) => [a.ticker, a]));

  return scannerRows
    .filter((r) => r.score)
    .map((row) => {
      const score = row.score!;
      const impact = impactByTicker.get(row.ticker);
      const intelligenceScore = impact?.score ?? NEUTRAL_INTELLIGENCE_SCORE;
      const combinedScore =
        score.combinedScore ??
        Math.round(score.totalScore * 0.75 + intelligenceScore * 0.25);

      return {
        ticker: row.ticker,
        watchlistId: row.watchlistId,
        technicalScore: score.totalScore,
        technicalDecision: score.decisionLabel,
        intelligenceScore,
        sentimentLabel: impact?.sentimentLabel ?? "Neutral (0)",
        combinedScore,
        combinedDecision: score.combinedDecisionLabel ?? score.decisionLabel,
        recommendedStrategy: score.recommendation.recommendedStrategy,
        intelligenceRationale: impact?.rationale ?? null,
      };
    })
    .sort((a, b) => b.combinedScore - a.combinedScore);
}

export function buildMarketIntelligencePageData(input: {
  documents: IntelligenceDocument[];
  summaries: IntelligenceSummary[];
  tickerImpacts: TickerIntelligenceImpact[];
  scannerRows: WatchlistScannerRow[];
  dataSource: "supabase" | "mock";
}): MarketIntelligencePageData {
  const aggregatedImpacts = buildAggregatedImpacts(
    input.tickerImpacts,
    input.summaries
  );

  return {
    documents: input.documents,
    summaries: input.summaries,
    tickerImpacts: input.tickerImpacts,
    aggregatedImpacts,
    decisionAssistant: buildOptionsDecisionAssistant(
      input.scannerRows,
      aggregatedImpacts
    ),
    dataSource: input.dataSource,
  };
}
