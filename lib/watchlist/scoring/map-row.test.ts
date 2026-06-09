import { describe, expect, it } from "vitest";
import { buildMockScannerRow } from "@/lib/mock/watchlist-scanner";
import { computeScannerScore } from "./compute";
import { scoreWatchlistRow } from "./map-row";

describe("scoreWatchlistRow", () => {
  it("uses average price for S/R scoring, not current price", () => {
    const row = buildMockScannerRow("SPY", 0);
    row.market.currentPrice = 200;
    row.market.averagePrice = 100;
    row.technicals.sma200 = 90;
    row.technicals.sma50 = 95;
    row.previousTechnicals.sma50 = 94;
    row.supportResistance.support1 = 98;
    row.supportResistance.resistance1 = 120;
    row.technicals.atr14 = 5;

    const fromRow = scoreWatchlistRow(row);
    const fromCurrentPrice = computeScannerScore({
      watchlistId: row.watchlistId,
      ticker: row.ticker,
      averagePrice: row.market.currentPrice,
      technicals: {
        ...row.technicals,
        sma50Previous: row.previousTechnicals.sma50,
      },
      distanceEma20Pct: row.distances.distanceEma20Pct,
      support: row.supportResistance.support1,
      resistance: row.supportResistance.resistance1,
    });

    expect(fromRow.supportResistance.score).toBe(10);
    expect(fromCurrentPrice.supportResistance.score).toBe(0);
  });

  it("derives SMA50 direction from previousTechnicals.sma50", () => {
    const row = buildMockScannerRow("SPY", 0);
    expect(row.previousTechnicals.sma50).not.toBeNull();
    expect(scoreWatchlistRow(row).trend.score).toBe(35);
  });
});
