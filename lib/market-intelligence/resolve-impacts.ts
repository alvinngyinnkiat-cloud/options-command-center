import {
  getMockIntelligenceSummaries,
  getMockTickerImpacts,
} from "@/lib/mock/market-intelligence-store";
import { NEUTRAL_INTELLIGENCE_SCORE } from "./constants";
import { buildAggregatedImpacts } from "./page-data";
import { sentimentLabel } from "./sentiment";
import type { AggregatedTickerIntelligence, IntelligenceLayer } from "./types";

export function getAggregatedIntelligenceMap(): Map<
  string,
  AggregatedTickerIntelligence
> {
  const aggregated = buildAggregatedImpacts(
    getMockTickerImpacts(),
    getMockIntelligenceSummaries()
  );
  return new Map(aggregated.map((a) => [a.ticker, a]));
}

export function resolveIntelligenceLayer(
  ticker: string,
  impactMap?: Map<string, AggregatedTickerIntelligence>
): IntelligenceLayer {
  const map = impactMap ?? getAggregatedIntelligenceMap();
  const impact = map.get(ticker);

  if (!impact) {
    return {
      score: NEUTRAL_INTELLIGENCE_SCORE,
      sentiment: "neutral",
      sentimentScore: 0,
      sentimentLabel: sentimentLabel("neutral"),
      rationale: null,
      sourceCount: 0,
      keyTakeaways: [],
      bullishSignals: [],
      bearishSignals: [],
    };
  }

  return {
    score: impact.score,
    sentiment: impact.sentiment,
    sentimentScore: impact.sentimentScore,
    sentimentLabel: impact.sentimentLabel,
    rationale: impact.rationale,
    sourceCount: impact.sourceCount,
    keyTakeaways: impact.keyTakeaways,
    bullishSignals: impact.bullishSignals,
    bearishSignals: impact.bearishSignals,
  };
}
