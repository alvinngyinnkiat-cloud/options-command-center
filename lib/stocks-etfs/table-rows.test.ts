import { describe, expect, it } from "vitest";
import type { UsEquityPositionRow } from "@/lib/stocks-etfs/us-equity-positions";
import {
  buildStockEtfTableMetrics,
  mapUsEquityRowsToTable,
  usEquityRowToTableRow,
} from "@/lib/stocks-etfs/table-rows";

function mockHolding(overrides: Partial<{ totalInvestedNative: number; currentValueNative: number }> = {}) {
  return {
    id: "h1",
    ticker: "VOO",
    assetType: "etf" as const,
    currency: "USD" as const,
    sector: "Broad Market" as const,
    totalInvestedNative: 10_000,
    currentValueNative: 11_000,
    fxRateToSgd: 1.35,
    totalInvestedSgd: 13_500,
    currentValueSgd: 14_850,
    profitLossSgd: 1_350,
    returnPct: 10,
    allocationPct: 20,
    sharesHeld: 10,
    averageCost: 1000,
    dividendYield: null,
    annualDividendIncome: null,
    notes: null,
    trackingMode: "transaction" as const,
    manualTotalDividend: 0,
    manualTotalFees: 0,
    lastUpdated: "2026-01-01",
    createdAt: "2026-01-01",
    updatedAt: "2026-01-01",
    ...overrides,
  };
}

function mockUsRow(overrides: Partial<UsEquityPositionRow> = {}): UsEquityPositionRow {
  const holding = mockHolding();
  return {
    ticker: "VOO",
    category: "us_etf",
    holding,
    shares: 10,
    averageCost: 1000,
    currentPrice: 1100,
    marketValue: 11_000,
    unrealizedPnl: 1_000,
    unrealizedPnlPct: 10,
    premiumCollected: 500,
    realizedPremiumIncome: 200,
    openPremiumIncome: 50,
    originalCostBasis: 10_000,
    adjustedCostBasis: 9_000,
    netPositionPnl: 2_000,
    totalReturnPct: 20,
    totalPnl: 2_750,
    associatedOptionsTrades: [],
    totalPremiumCollected: 500,
    etfOrStockValue: 11_000,
    leapsValue: 0,
    currentAssetValue: 11_000,
    leapsPositions: [],
    openTradesCount: 2,
    closedTradesCount: 3,
    roiPct: 20,
    dividendIncome: 250,
    annualDividendIncome: 100,
    annualPremiumIncome: 500,
    incomeYieldPct: 6,
    ...overrides,
  };
}

describe("stock etf table rows", () => {
  it("computes P/L and ROI from capital and value (excludes dividend)", () => {
    const holding = mockHolding();
    expect(
      buildStockEtfTableMetrics(holding, 10_000, 11_000, 250)
    ).toMatchObject({
      pl: 1_000,
      roiPct: 10,
      dividend: 250,
    });
  });

  it("maps US rows with dividend, P/L, and ROI", () => {
    const row = usEquityRowToTableRow(mockUsRow());
    expect(row).toMatchObject({
      ticker: "VOO",
      capital: 10_000,
      currentValue: 11_000,
      dividend: 250,
      pl: 1_000,
      roiPct: 10,
      currency: "USD",
    });
  });

  it("excludes trade-only rows without holdings", () => {
    const mapped = mapUsEquityRowsToTable([
      mockUsRow({ holding: null }),
      mockUsRow(),
    ]);
    expect(mapped).toHaveLength(1);
  });
});
