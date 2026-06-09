import { describe, expect, it } from "vitest";
import { buildTradeQueue } from "./trade-queue";
import { buildMarketCondition } from "./market-condition";
import { BULL_PUT_PERFECT_FIXTURE } from "@/lib/watchlist/scoring/fixtures";
import { computeScannerScore } from "@/lib/watchlist/scoring/compute";
import { computeStrategyRecommendation } from "@/lib/watchlist/recommendation";
import type { WatchlistScannerRow } from "@/lib/watchlist/types";

function mockRow(ticker: string, score: number): WatchlistScannerRow {
  const computed = computeScannerScore({
    ...BULL_PUT_PERFECT_FIXTURE,
    ticker,
    watchlistId: `mock-${ticker}`,
  });
  const rec = computeStrategyRecommendation({
    averagePrice: BULL_PUT_PERFECT_FIXTURE.averagePrice,
    stochastic: BULL_PUT_PERFECT_FIXTURE.technicals.stochastic,
    distanceEma20Pct: 1,
    atr14: BULL_PUT_PERFECT_FIXTURE.technicals.atr14,
    support: 100,
    resistance: 120,
    sma50: BULL_PUT_PERFECT_FIXTURE.technicals.sma50,
    sma200: BULL_PUT_PERFECT_FIXTURE.technicals.sma200,
    sma50Previous: BULL_PUT_PERFECT_FIXTURE.technicals.sma50Previous,
    score: computed,
  });
  return {
    watchlistId: `mock-${ticker}`,
    ticker,
    category: "ETF",
    sortOrder: 0,
    market: {
      currentPrice: 110,
      open: 108,
      high: 112,
      low: 106,
      averagePrice: 109,
      close: 110,
      previousClose: 108,
      dailyChangePct: 1.8,
    },
    previousMarket: { high: 111, low: 105, averagePrice: 108 },
    averagePriceComparison: {
      todayAverage: 109,
      previousAverage: 108,
      difference: 1,
      differencePct: 0.9,
      direction: "up",
    },
    technicals: BULL_PUT_PERFECT_FIXTURE.technicals,
    previousTechnicals: {
      atr14: 2,
      ema20: 108,
      sma50: 105,
      sma200: 100,
      stochastic: 20,
    },
    technicalComparisons: {} as WatchlistScannerRow["technicalComparisons"],
    distances: {} as WatchlistScannerRow["distances"],
    averagePricePosition: {
      zone: "mid",
      label: "Mid Range",
      positionPct: 50,
    },
    supportResistance: {
      id: null,
      watchlistId: `mock-${ticker}`,
      support1: 100,
      support2: null,
      resistance1: 120,
      resistance2: null,
      notes: null,
      updateDate: "2026-06-06",
      timeframe: "daily",
    },
    score: {
      ...computed,
      totalScore: score,
      recommendation: rec,
      intelligence: {
        score: 50,
        sentiment: "neutral",
        sentimentScore: 0,
        sentimentLabel: "Neutral (0)",
        rationale: null,
        sourceCount: 0,
        keyTakeaways: [],
        bullishSignals: [],
        bearishSignals: [],
      },
      combinedScore: score,
      combinedDecisionLabel: computed.decisionLabel,
    },
  };
}

describe("trade queue", () => {
  it("returns top 5 ranked opportunities", () => {
    const rows = ["SPY", "QQQ", "IWM", "AVGO", "NVDA", "AAPL"].map((t, i) =>
      mockRow(t, 95 - i * 5)
    );
    const market = buildMarketCondition(rows);
    const queue = buildTradeQueue(rows, [], {
      portfolioValue: 400000,
      stocksEtfValue: 200000,
      cryptoValue: 50000,
      cash: { cashSgd: 50000, cashUsdNative: 10000, cashUsdSgd: 13500, cashAvailable: 10000, tradingCashSgd: 50000, cryptoCashSgd: 0 },
      currentOpenRisk: 5000,
      currentPositionMarketValue: 3000,
      currentPositionCloseRequirement: 3000,
      openTradesCount: 2,
      maximumOptionsCapital: 150000,
      availableRiskCapacity: 50000,
      maximumRiskPerTrade: 5000,
    }, market, 5);
    expect(queue.length).toBeLessThanOrEqual(5);
    expect(queue[0]?.priorityRank).toBe(1);
  });
});
