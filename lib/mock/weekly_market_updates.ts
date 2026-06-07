export interface WeeklyMarketUpdate {
  id: string;
  weekEnding: string;
  title: string;
  summary: string;
  publishedAt: string;
  sentiment: "bullish" | "bearish" | "neutral";
  keyLevels: string[];
}

export const MOCK_WEEKLY_MARKET_UPDATES: WeeklyMarketUpdate[] = [
  {
    id: "wmu-2026-06-06",
    weekEnding: "2026-06-06",
    title: "Range-bound week; VIX compression favors iron condors",
    summary:
      "Markets held inside prior weekly ranges. Credit spreads remain favored with elevated premium in tech names. Manual S/R levels unchanged on SPY and QQQ.",
    publishedAt: "2026-06-06T16:00:00Z",
    sentiment: "neutral",
    keyLevels: ["SPY 520 support", "QQQ 440 resistance", "VIX sub-15"],
  },
  {
    id: "wmu-2026-05-30",
    weekEnding: "2026-05-30",
    title: "Pullback into support; bull put setups on watch",
    summary:
      "Indices tested daily support zones. Scanner flagged 4 names with favorable risk/reward for bull put spreads entering June.",
    publishedAt: "2026-05-30T16:00:00Z",
    sentiment: "bullish",
    keyLevels: ["IWM 198 support", "AAPL 198 support"],
  },
];

export const LATEST_WEEKLY_MARKET_UPDATE = MOCK_WEEKLY_MARKET_UPDATES[0];
