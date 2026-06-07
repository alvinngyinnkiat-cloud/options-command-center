import {
  SENTIMENT_LABELS,
  SENTIMENT_SCORE_TO_SENTIMENT,
  SENTIMENT_TO_IMPACT_SCORE,
} from "./constants";
import type { MarketSentiment, SentimentScore } from "./types";

export function clampSentimentScore(value: number): SentimentScore {
  if (value >= 2) return 2;
  if (value >= 1) return 1;
  if (value <= -2) return -2;
  if (value <= -1) return -1;
  return 0;
}

export function sentimentFromScore(score: SentimentScore): MarketSentiment {
  return SENTIMENT_SCORE_TO_SENTIMENT[score];
}

export function impactScoreFromSentiment(score: SentimentScore): number {
  return SENTIMENT_TO_IMPACT_SCORE[score];
}

export function sentimentLabel(sentiment: MarketSentiment): string {
  return SENTIMENT_LABELS[sentiment];
}

export function deriveSentimentFromCounts(
  bullishCount: number,
  bearishCount: number
): SentimentScore {
  const net = bullishCount - bearishCount;
  if (net >= 4) return 2;
  if (net >= 2) return 1;
  if (net <= -4) return -2;
  if (net <= -2) return -1;
  return 0;
}
