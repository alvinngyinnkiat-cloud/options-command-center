import type {
  IntelligenceDocument,
  IntelligenceSummary,
  TickerIntelligenceImpact,
} from "@/lib/market-intelligence/types";

import {
  MOCK_REFERENCE_DATE,
  MOCK_REFERENCE_ISO,
} from "@/lib/mock/reference-dates";

const MOCK_USER = "mock-user";
const now = MOCK_REFERENCE_ISO;
const today = MOCK_REFERENCE_DATE;

export const MOCK_INTELLIGENCE_DOCUMENTS: IntelligenceDocument[] = [
  {
    id: "mi-doc-1",
    title: "Weekly Options Newsletter — June Week 1",
    sourceType: "newsletter",
    fileName: "options-weekly-june.txt",
    mimeType: "text/plain",
    rawText:
      "SPY remains in a bullish range with strong support at 505. QQQ shows breakout potential above 440 with upgrade catalysts. IWM faces downside risk on weak retail data. Iron condor setups favored on SPY and QQQ where SO is mid-band. AVGO earnings beat drove rally — bullish momentum continues.",
    publishedAt: today,
    uploadedAt: now,
    createdAt: now,
    updatedAt: now,
  },
  {
    id: "mi-doc-2",
    title: "Reddit r/options Weekly Sentiment",
    sourceType: "reddit",
    fileName: "reddit-summary.txt",
    mimeType: "text/plain",
    rawText:
      "Retail sentiment on SPY is cautiously bullish. QQQ discussed as strong momentum play. Concerns about IWM slowdown and recession risk. NVDA mentioned as overextended — bearish near-term pressure after surge.",
    publishedAt: today,
    uploadedAt: now,
    createdAt: now,
    updatedAt: now,
  },
];

export const MOCK_INTELLIGENCE_SUMMARIES: IntelligenceSummary[] = [
  {
    id: "mi-sum-1",
    documentId: "mi-doc-1",
    keyTakeaways: [
      "SPY bullish range with support at 505",
      "QQQ breakout potential above 440",
      "Iron condor favored on range-bound names",
    ],
    bullishSignals: [
      "SPY remains in a bullish range with strong support",
      "AVGO earnings beat drove rally",
    ],
    bearishSignals: ["IWM faces downside risk on weak retail data"],
    overallSentiment: "bullish",
    sentimentScore: 1,
    summaryText:
      "Bullish bias on large caps; range strategies favored on SPY/QQQ.",
    generatedAt: now,
  },
  {
    id: "mi-sum-2",
    documentId: "mi-doc-2",
    keyTakeaways: [
      "Retail cautiously bullish on SPY",
      "QQQ momentum play",
      "NVDA overextended concerns",
    ],
    bullishSignals: ["QQQ discussed as strong momentum play"],
    bearishSignals: [
      "Concerns about IWM slowdown and recession risk",
      "NVDA overextended — bearish near-term pressure",
    ],
    overallSentiment: "neutral",
    sentimentScore: 0,
    summaryText: "Mixed retail sentiment; large-cap bias with small-cap caution.",
    generatedAt: now,
  },
];

export const MOCK_TICKER_IMPACTS: TickerIntelligenceImpact[] = [
  {
    id: "mi-impact-1",
    documentId: "mi-doc-1",
    watchlistId: "mock-SPY",
    ticker: "SPY",
    impactDate: today,
    sentiment: "bullish",
    sentimentScore: 1,
    impactScore: 78,
    rationale: "Bullish range with strong support at 505",
  },
  {
    id: "mi-impact-2",
    documentId: "mi-doc-1",
    watchlistId: "mock-QQQ",
    ticker: "QQQ",
    impactDate: today,
    sentiment: "very_bullish",
    sentimentScore: 2,
    impactScore: 95,
    rationale: "Breakout potential with upgrade catalysts",
  },
  {
    id: "mi-impact-3",
    documentId: "mi-doc-1",
    watchlistId: "mock-IWM",
    ticker: "IWM",
    impactDate: today,
    sentiment: "bearish",
    sentimentScore: -1,
    impactScore: 28,
    rationale: "Downside risk on weak retail data",
  },
  {
    id: "mi-impact-4",
    documentId: "mi-doc-2",
    watchlistId: "mock-SPY",
    ticker: "SPY",
    impactDate: today,
    sentiment: "bullish",
    sentimentScore: 1,
    impactScore: 78,
    rationale: "Retail cautiously bullish",
  },
  {
    id: "mi-impact-5",
    documentId: "mi-doc-2",
    watchlistId: "mock-NVDA",
    ticker: "NVDA",
    impactDate: today,
    sentiment: "bearish",
    sentimentScore: -1,
    impactScore: 28,
    rationale: "Overextended after surge",
  },
];
