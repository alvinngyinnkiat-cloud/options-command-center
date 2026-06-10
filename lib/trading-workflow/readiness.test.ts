import { describe, expect, it } from "vitest";
import { buildTradeQueue } from "./trade-queue";
import { buildMarketCondition } from "./market-condition";
import { BULL_PUT_PERFECT_FIXTURE } from "@/lib/watchlist/scoring/fixtures";
import { scoreWatchlistRow } from "@/lib/watchlist/scoring/map-row";
import type { WatchlistScannerRow } from "@/lib/watchlist/types";

function mockRow(ticker: string): WatchlistScannerRow {
  const base: WatchlistScannerRow = {
    watchlistId: `mock-${ticker}`,
    ticker,
    category: "ETF",
    sortOrder: 0,
    priorityRank: 1,
    notes: null,
    isActive: true,
    market: {
      currentPrice: 110,
      open: 108,
      high: 112,
      low: 106,
      averagePrice: BULL_PUT_PERFECT_FIXTURE.averagePrice,
      close: 110,
      previousClose: 108,
      dailyChangePct: 1.8,
    },
    previousMarket: { high: 111, low: 105, averagePrice: 108 },
    averagePriceComparison: {
      todayAverage: BULL_PUT_PERFECT_FIXTURE.averagePrice,
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
      zone: "support",
      label: "Near Support",
      positionPct: 25,
    },
    supportResistance: {
      id: null,
      watchlistId: `mock-${ticker}`,
      support1: BULL_PUT_PERFECT_FIXTURE.support ?? 105,
      support2: null,
      resistance1: BULL_PUT_PERFECT_FIXTURE.resistance ?? 115,
      resistance2: null,
      notes: null,
      updateDate: "2026-06-06",
      timeframe: "daily",
    },
    weeklySupportResistance: null,
  };
  return { ...base, score: scoreWatchlistRow(base) };
}

describe("trade queue", () => {
  it("returns top 5 ranked opportunities", () => {
    const rows = ["SPY", "QQQ", "IWM", "AVGO", "NVDA", "AAPL"].map((t) =>
      mockRow(t)
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
    expect(queue.length).toBeGreaterThan(0);
    expect(queue.length).toBeLessThanOrEqual(5);
    expect(queue[0]?.priorityRank).toBe(1);
  });
});
