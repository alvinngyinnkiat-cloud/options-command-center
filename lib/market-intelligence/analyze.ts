import { BULLISH_KEYWORDS, BEARISH_KEYWORDS } from "./constants";
import {
  clampSentimentScore,
  deriveSentimentFromCounts,
  impactScoreFromSentiment,
  sentimentFromScore,
} from "./sentiment";
import type {
  IntelligenceSummary,
  MarketSentiment,
  SentimentScore,
  TickerIntelligenceImpact,
} from "./types";

function countKeywords(text: string, keywords: string[]): number {
  const lower = text.toLowerCase();
  return keywords.reduce(
    (sum, kw) => sum + (lower.split(kw).length - 1),
    0
  );
}

function extractSentences(text: string): string[] {
  return text
    .split(/[.!?]+/)
    .map((s) => s.trim())
    .filter((s) => s.length > 20)
    .slice(0, 12);
}

function findTickerMentions(
  text: string,
  tickers: string[]
): { ticker: string; context: string }[] {
  const upper = text.toUpperCase();
  const mentions: { ticker: string; context: string }[] = [];

  for (const ticker of tickers) {
    const idx = upper.indexOf(ticker);
    if (idx < 0) continue;
    const start = Math.max(0, idx - 120);
    const end = Math.min(text.length, idx + ticker.length + 120);
    mentions.push({
      ticker,
      context: text.slice(start, end),
    });
  }

  return mentions;
}

export interface AnalysisResult {
  summary: Omit<
    IntelligenceSummary,
    "id" | "documentId" | "generatedAt"
  >;
  tickerImpacts: Omit<
    TickerIntelligenceImpact,
    "id" | "documentId" | "impactDate"
  >[];
}

export function analyzeDocumentText(
  rawText: string,
  watchlistTickers: string[]
): AnalysisResult {
  const sentences = extractSentences(rawText);
  const bullishTotal = countKeywords(rawText, BULLISH_KEYWORDS);
  const bearishTotal = countKeywords(rawText, BEARISH_KEYWORDS);
  const overallSentimentScore = deriveSentimentFromCounts(
    bullishTotal,
    bearishTotal
  );
  const overallSentiment = sentimentFromScore(overallSentimentScore);

  const bullishSignals = sentences
    .filter((s) => countKeywords(s, BULLISH_KEYWORDS) > 0)
    .slice(0, 5);
  const bearishSignals = sentences
    .filter((s) => countKeywords(s, BEARISH_KEYWORDS) > 0)
    .slice(0, 5);
  const keyTakeaways = sentences.slice(0, 4);

  const mentions = findTickerMentions(rawText, watchlistTickers);
  const tickerImpacts: AnalysisResult["tickerImpacts"] = [];

  for (const mention of mentions) {
    const bull = countKeywords(mention.context, BULLISH_KEYWORDS);
    const bear = countKeywords(mention.context, BEARISH_KEYWORDS);
    const score = deriveSentimentFromCounts(bull, bear);
    const sentiment = sentimentFromScore(score);
    tickerImpacts.push({
      watchlistId: null,
      ticker: mention.ticker,
      sentiment,
      sentimentScore: score,
      impactScore: impactScoreFromSentiment(score),
      rationale:
        bull > bear
          ? `Bullish context detected near ${mention.ticker} mention`
          : bear > bull
            ? `Bearish context detected near ${mention.ticker} mention`
            : `Neutral context for ${mention.ticker}`,
    });
  }

  if (tickerImpacts.length === 0 && watchlistTickers.length > 0) {
    for (const ticker of watchlistTickers.slice(0, 3)) {
      tickerImpacts.push({
        watchlistId: null,
        ticker,
        sentiment: overallSentiment,
        sentimentScore: overallSentimentScore,
        impactScore: impactScoreFromSentiment(overallSentimentScore),
        rationale: `Document-wide ${overallSentiment.replace("_", " ")} sentiment applied`,
      });
    }
  }

  return {
    summary: {
      keyTakeaways,
      bullishSignals,
      bearishSignals,
      overallSentiment,
      sentimentScore: overallSentimentScore,
      summaryText: keyTakeaways.join(" "),
    },
    tickerImpacts,
  };
}

export function aggregateTickerImpacts(
  impacts: TickerIntelligenceImpact[]
): Map<string, { score: number; sentiment: MarketSentiment; sentimentScore: SentimentScore; rationale: string; sourceCount: number; takeaways: string[]; bullish: string[]; bearish: string[] }> {
  const byTicker = new Map<
    string,
    {
      scores: number[];
      sentimentScores: SentimentScore[];
      rationales: string[];
    }
  >();

  for (const impact of impacts) {
    const existing = byTicker.get(impact.ticker) ?? {
      scores: [],
      sentimentScores: [],
      rationales: [],
    };
    existing.scores.push(impact.impactScore);
    existing.sentimentScores.push(impact.sentimentScore);
    if (impact.rationale) existing.rationales.push(impact.rationale);
    byTicker.set(impact.ticker, existing);
  }

  const result = new Map<
    string,
    {
      score: number;
      sentiment: MarketSentiment;
      sentimentScore: SentimentScore;
      rationale: string;
      sourceCount: number;
      takeaways: string[];
      bullish: string[];
      bearish: string[];
    }
  >();

  for (const [ticker, data] of byTicker) {
    const avgScore = Math.round(
      data.scores.reduce((s, v) => s + v, 0) / data.scores.length
    );
    const avgSentimentScore = clampSentimentScore(
      Math.round(
        data.sentimentScores.reduce<number>((s, v) => s + v, 0) /
          data.sentimentScores.length
      )
    );
    result.set(ticker, {
      score: avgScore,
      sentiment: sentimentFromScore(avgSentimentScore),
      sentimentScore: avgSentimentScore,
      rationale: data.rationales[0] ?? null,
      sourceCount: data.scores.length,
      takeaways: [],
      bullish: [],
      bearish: [],
    });
  }

  return result;
}
