import type { IntelligenceSourceType, MarketSentiment, SentimentScore } from "./types";

export const COMBINED_WEIGHTS = {
  technical: 0.75,
  intelligence: 0.25,
} as const;

export const NEUTRAL_INTELLIGENCE_SCORE = 50;

export const SOURCE_TYPE_LABELS: Record<IntelligenceSourceType, string> = {
  newsletter: "Newsletter",
  research: "Research Report",
  commentary: "Market Commentary",
  earnings: "Earnings Report",
  analyst_notes: "Analyst Notes",
  reddit: "Reddit Summary",
  personal_notes: "Personal Notes",
};

export const SENTIMENT_LABELS: Record<MarketSentiment, string> = {
  very_bullish: "Very Bullish (+2)",
  bullish: "Bullish (+1)",
  neutral: "Neutral (0)",
  bearish: "Bearish (-1)",
  very_bearish: "Very Bearish (-2)",
};

export const SENTIMENT_SCORE_TO_SENTIMENT: Record<
  SentimentScore,
  MarketSentiment
> = {
  2: "very_bullish",
  1: "bullish",
  0: "neutral",
  [-1]: "bearish",
  [-2]: "very_bearish",
};

/** Maps sentiment score (-2..+2) to 0–100 intelligence score. */
export const SENTIMENT_TO_IMPACT_SCORE: Record<SentimentScore, number> = {
  2: 95,
  1: 78,
  0: 50,
  [-1]: 28,
  [-2]: 10,
};

export const BULLISH_KEYWORDS = [
  "rally",
  "breakout",
  "beat",
  "upgrade",
  "strong",
  "growth",
  "bullish",
  "upside",
  "outperform",
  "buy",
  "support",
  "recovery",
  "expansion",
  "record",
  "surge",
];

export const BEARISH_KEYWORDS = [
  "decline",
  "miss",
  "downgrade",
  "weak",
  "bearish",
  "risk",
  "downside",
  "cut",
  "recession",
  "selloff",
  "underperform",
  "sell",
  "pressure",
  "slowdown",
  "concern",
];
