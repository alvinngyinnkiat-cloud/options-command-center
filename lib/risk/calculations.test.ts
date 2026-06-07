import { describe, expect, it } from "vitest";
import {
  buildRiskFramework,
  calculateAvailableRiskCapacity,
  calculateMaximumOptionsCapital,
  calculateMaximumRiskPerTrade,
  calculateRiskUtilizationPct,
  getRiskZone,
} from "./calculations";
import { buildTickerExposureRows } from "./ticker-exposure";
import type { EnrichedTrade } from "@/lib/trades/types";

describe("risk calculations", () => {
  const portfolioValue = 400_000;
  const currentOpenRisk = 50_000;

  it("calculates maximum options capital at 75%", () => {
    expect(calculateMaximumOptionsCapital(portfolioValue)).toBe(300_000);
  });

  it("calculates available risk capacity", () => {
    expect(
      calculateAvailableRiskCapacity(300_000, currentOpenRisk)
    ).toBe(250_000);
  });

  it("calculates maximum risk per trade at 2.5% of available capacity", () => {
    expect(calculateMaximumRiskPerTrade(250_000)).toBe(6_250);
  });

  it("calculates risk utilization percent", () => {
    expect(calculateRiskUtilizationPct(50_000, 300_000)).toBeCloseTo(16.67, 1);
  });

  it("assigns risk zones", () => {
    expect(getRiskZone(50)).toBe("safe");
    expect(getRiskZone(65)).toBe("caution");
    expect(getRiskZone(80)).toBe("danger");
  });

  it("builds full framework", () => {
    const result = buildRiskFramework({ portfolioValue, currentOpenRisk });
    expect(result.maximumOptionsCapital).toBe(300_000);
    expect(result.maximumRiskPerTrade).toBe(6_250);
    expect(result.riskZone).toBe("safe");
  });

});

describe("ticker exposure", () => {
  function mockTrade(
    id: string,
    ticker: string,
    maxRisk: number
  ): EnrichedTrade {
    return {
      id,
      ticker,
      strategy: "bull_put_spread",
      strategyLabel: "Bull Put Spread",
      status: "open",
      contracts: 1,
      calculations: {
        maxRisk,
        currentPnl: 100,
        buyingPowerUsed: 500,
        dte: 14,
        takeProfitPrice: 200,
      },
    } as EnrichedTrade;
  }

  it("flags duplicate tickers", () => {
    const rows = buildTickerExposureRows(
      [mockTrade("1", "SPY", 5000), mockTrade("2", "SPY", 3000)],
      300_000
    );
    expect(rows.every((r) => r.isDuplicate)).toBe(true);
    expect(rows[0].statusLabel).toContain("Duplicate");
  });

  it("flags largest positions", () => {
    const rows = buildTickerExposureRows(
      [
        mockTrade("1", "SPY", 8000),
        mockTrade("2", "QQQ", 5000),
        mockTrade("3", "IWM", 3000),
      ],
      300_000
    );
    expect(rows[0].isLargest).toBe(true);
    expect(rows[0].ticker).toBe("SPY");
  });
});
