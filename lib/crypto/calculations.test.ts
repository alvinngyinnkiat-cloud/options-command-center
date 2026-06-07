import { describe, expect, it } from "vitest";
import {
  buildCryptoHoldingMetrics,
  buildCryptoTrackerSummary,
  calculateCryptoAllocationPct,
  calculateCryptoProfitLossSgd,
  calculateCryptoReturnPct,
} from "./calculations";
import type { EnrichedCryptoHolding } from "./types";

describe("crypto calculations", () => {
  it("calculates profit/loss SGD", () => {
    expect(calculateCryptoProfitLossSgd(15_000, 10_000)).toBe(5000);
    expect(calculateCryptoProfitLossSgd(8_000, 10_000)).toBe(-2000);
  });

  it("calculates return %", () => {
    expect(calculateCryptoReturnPct(5000, 10_000)).toBe(50);
    expect(calculateCryptoReturnPct(-2000, 10_000)).toBe(-20);
  });

  it("calculates allocation %", () => {
    expect(calculateCryptoAllocationPct(6000, 20_000)).toBe(30);
  });

  it("builds holding metrics", () => {
    const m = buildCryptoHoldingMetrics(10_000, 12_000, 20_000);
    expect(m.profitLossSgd).toBe(2000);
    expect(m.returnPct).toBe(20);
    expect(m.allocationPct).toBe(60);
  });

  it("builds tracker summary", () => {
    const holdings: EnrichedCryptoHolding[] = [
      {
        id: "1",
        assetLabel: "BTC",
        ticker: "BTC",
        totalInvestedSgd: 10_000,
        currentValueSgd: 14_000,
        profitLossSgd: 4000,
        returnPct: 40,
        allocationPct: 70,
        notes: null,
        lastUpdated: "2026-06-06",
        createdAt: "",
        updatedAt: "",
      },
      {
        id: "2",
        assetLabel: "ETH",
        ticker: "ETH",
        totalInvestedSgd: 5_000,
        currentValueSgd: 6_000,
        profitLossSgd: 1000,
        returnPct: 20,
        allocationPct: 30,
        notes: null,
        lastUpdated: "2026-06-06",
        createdAt: "",
        updatedAt: "",
      },
    ];
    const summary = buildCryptoTrackerSummary(holdings);
    expect(summary.totalInvestedSgd).toBe(15_000);
    expect(summary.totalCurrentValueSgd).toBe(20_000);
    expect(summary.totalProfitLossSgd).toBe(5000);
    expect(summary.largestHolding?.ticker).toBe("BTC");
    expect(summary.bestPerforming?.ticker).toBe("BTC");
  });
});
