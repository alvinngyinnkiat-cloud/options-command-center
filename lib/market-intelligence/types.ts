import type { DataSource } from "@/lib/portfolio/types";
import type { DecisionLabel } from "@/lib/watchlist/scoring/types";

export type IntelligenceSourceType =
  | "newsletter"
  | "research"
  | "commentary"
  | "earnings"
  | "analyst_notes"
  | "reddit"
  | "personal_notes";

export type MarketSentiment =
  | "very_bullish"
  | "bullish"
  | "neutral"
  | "bearish"
  | "very_bearish";

export type SentimentScore = -2 | -1 | 0 | 1 | 2;

export interface IntelligenceDocument {
  id: string;
  title: string;
  sourceType: IntelligenceSourceType;
  fileName: string | null;
  mimeType: string | null;
  rawText: string;
  publishedAt: string | null;
  uploadedAt: string;
  createdAt: string;
  updatedAt: string;
}

export interface IntelligenceSummary {
  id: string;
  documentId: string;
  keyTakeaways: string[];
  bullishSignals: string[];
  bearishSignals: string[];
  overallSentiment: MarketSentiment;
  sentimentScore: SentimentScore;
  summaryText: string | null;
  generatedAt: string;
}

export interface TickerIntelligenceImpact {
  id: string;
  documentId: string | null;
  watchlistId: string | null;
  ticker: string;
  impactDate: string;
  sentiment: MarketSentiment;
  sentimentScore: SentimentScore;
  impactScore: number;
  rationale: string | null;
}

export interface AggregatedTickerIntelligence {
  ticker: string;
  score: number;
  sentiment: MarketSentiment;
  sentimentScore: SentimentScore;
  sentimentLabel: string;
  rationale: string | null;
  sourceCount: number;
  keyTakeaways: string[];
  bullishSignals: string[];
  bearishSignals: string[];
}

export interface IntelligenceLayer {
  score: number;
  sentiment: MarketSentiment;
  sentimentScore: SentimentScore;
  sentimentLabel: string;
  rationale: string | null;
  sourceCount: number;
  keyTakeaways: string[];
  bullishSignals: string[];
  bearishSignals: string[];
}

export interface CombinedScoreResult {
  technicalScore: number;
  intelligenceScore: number;
  combinedScore: number;
  combinedDecisionLabel: DecisionLabel;
}

export interface OptionsDecisionRow {
  ticker: string;
  watchlistId: string;
  technicalScore: number;
  technicalDecision: string;
  intelligenceScore: number;
  sentimentLabel: string;
  combinedScore: number;
  combinedDecision: string;
  recommendedStrategy: string;
  intelligenceRationale: string | null;
}

export interface MarketIntelligencePageData {
  documents: IntelligenceDocument[];
  summaries: IntelligenceSummary[];
  tickerImpacts: TickerIntelligenceImpact[];
  aggregatedImpacts: AggregatedTickerIntelligence[];
  decisionAssistant: OptionsDecisionRow[];
  dataSource: DataSource;
}

export interface DocumentUploadInput {
  title: string;
  sourceType: IntelligenceSourceType;
  rawText: string;
  fileName?: string | null;
  mimeType?: string | null;
  publishedAt?: string | null;
}
