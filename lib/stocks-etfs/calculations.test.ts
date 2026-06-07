import { describe, expect, it } from "vitest";
import {
  buildStockEtfHoldingMetrics,
  buildStockEtfTrackerSummary,
  calculateStockEtfAllocationPct,
  calculateStockEtfProfitLossSgd,
  calculateStockEtfReturnPct,
} from "./calculations";
import { buildConcentrationWarnings, buildTopHoldings } from "./concentration";
import type { EnrichedStockEtfHolding } from "./types";

function holding(
  partial: Partial<EnrichedStockEtfHolding> & Pick<EnrichedStockEtfHolding, "ticker">
): EnrichedStockEtfHolding {
  return {
    id: partial.id ?? partial.ticker,
    assetType: partial.assetType ?? "stock",
    currency: partial.currency ?? "SGD",
    sector: partial.sector ?? "Others",
    totalInvestedNative: partial.totalInvestedNative ?? 10_000,
    currentValueNative: partial.currentValueNative ?? 12_000,
    fxRateToSgd: partial.fxRateToSgd ?? 1,
    totalInvestedSgd: partial.totalInvestedSgd ?? 10_000,
    currentValueSgd: partial.currentValueSgd ?? 12_000,
    profitLossSgd: partial.profitLossSgd ?? 2_000,
    returnPct: partial.returnPct ?? 20,
    allocationPct: partial.allocationPct ?? 50,
    sharesHeld: partial.sharesHeld ?? null,
    averageCost: partial.averageCost ?? null,
    notes: partial.notes ?? null,
    lastUpdated: "2026-06-06",
    createdAt: "2026-06-01",
    updatedAt: "2026-06-06",
    ...partial,
  };
}

describe("stock etf calculations", () => {
  it("calculates profit/loss", () => {
    expect(calculateStockEtfProfitLossSgd(12_000, 10_000)).toBe(2_000);
  });

  it("calculates return %", () => {
    expect(calculateStockEtfReturnPct(2_000, 10_000)).toBe(20);
  });

  it("calculates allocation %", () => {
    expect(calculateStockEtfAllocationPct(25_000, 100_000)).toBe(25);
  });

  it("builds holding metrics", () => {
    const m = buildStockEtfHoldingMetrics(10_000, 11_500, 50_000);
    expect(m.profitLossSgd).toBe(1_500);
    expect(m.returnPct).toBe(15);
    expect(m.allocationPct).toBe(23);
  });

  it("builds summary with best and worst", () => {
    const rows = [
      holding({ ticker: "A", returnPct: 10, currentValueSgd: 30_000, allocationPct: 60 }),
      holding({ ticker: "B", returnPct: -5, currentValueSgd: 20_000, allocationPct: 40 }),
    ];
    const summary = buildStockEtfTrackerSummary(rows);
    expect(summary.bestPerforming?.ticker).toBe("A");
    expect(summary.worstPerforming?.ticker).toBe("B");
    expect(summary.largestHolding?.ticker).toBe("A");
  });
});

describe("concentration", () => {
  it("flags holding above 20% and 30%", () => {
    const rows = [
      holding({ ticker: "BIG", currentValueSgd: 35_000, allocationPct: 35 }),
      holding({ ticker: "SMALL", currentValueSgd: 65_000, allocationPct: 65 }),
    ];
    const top = buildTopHoldings(rows, 2);
    expect(top).toHaveLength(2);
    const warnings = buildConcentrationWarnings(rows, []);
    expect(warnings.some((w) => w.label === "BIG" && w.level === "critical")).toBe(
      true
    );
  });
});
