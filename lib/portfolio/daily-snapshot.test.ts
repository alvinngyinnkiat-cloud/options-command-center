import { describe, expect, it } from "vitest";
import { buildDailySnapshotPayload } from "@/lib/portfolio/daily-snapshot";
import type { CapitalPoolsBreakdown } from "@/lib/portfolio/capital-pools";
import type { PortfolioMetrics } from "@/lib/portfolio/types";
import type { PortfolioPnlBreakdown } from "@/lib/trades/pnl-allocation";

function minimalMetrics(): PortfolioMetrics {
  return {
    portfolioValue: 100_000,
    myPortfolioValue: 100_000,
    tradingCapital: 80_000,
    healthScore: { score: 75, label: "Good", factors: [] },
    holdings: [],
    override: null,
    comparison: null,
    availableRiskCapacity: 50_000,
    cryptoValue: 0,
    cryptoCashSgd: 0,
    cashValue: 0,
    totalCashSgd: 0,
    cryptoPortfolioValueSgd: 0,
    cryptoCapital: 0,
    tradingCashSgd: 0,
  } as PortfolioMetrics;
}

function minimalPnl(): PortfolioPnlBreakdown {
  return {
    myOpenPnl: 0,
    myRealizedPnl: 0,
    clientOpenPnl: 0,
    clientRealizedPnl: 0,
    totalOpenPnl: 0,
    totalRealizedPnl: 0,
  };
}

function pools(overrides: Partial<CapitalPoolsBreakdown>): CapitalPoolsBreakdown {
  return {
    usEtfValueSgd: 0,
    usStockValueSgd: 0,
    sgStockValueSgd: 0,
    optionsValueSgd: 0,
    tradingCashSgd: 0,
    cryptoHoldingsSgd: 0,
    cryptoCashSgd: 0,
    cryptoPortfolioValueSgd: 0,
    cryptoCapital: 0,
    appCalculatedValueSgd: 115_000,
    brokerReferencePortfolioValueSgd: null,
    manualOverallPortfolioValueSgd: null,
    portfolioValueDifferenceSgd: null,
    portfolioValueSource: "manual_breakdown",
    tradingCapital: 80_000,
    totalPortfolioSgd: 115_000,
    clientPortfolioSgd: 15_000,
    myPortfolioValue: 100_000,
    clientOwnershipPct: 13.04,
    myOwnershipPct: 86.96,
    clientInitialCapital: 10_000,
    clientCurrentValue: 12_500,
    clientPnl: 2_500,
    clientReturnPct: 25,
    totalAssetsManaged: 127_500,
    cash: {
      tradingCashSgd: 0,
      brokerUsdCashNative: 0,
      brokerSgdCash: 0,
      cryptoCashSgd: 0,
      totalCashSgd: 0,
      availableForStocksSgd: 0,
      availableForEtfsSgd: 0,
      availableForOptionsSgd: 0,
      availableForCryptoSgd: 0,
    },
    ...overrides,
  };
}

describe("buildDailySnapshotPayload", () => {
  it("uses ownership split for my and client values, not profit-sharing client current", () => {
    const payload = buildDailySnapshotPayload({
      metrics: minimalMetrics(),
      openRisk: 0,
      pnl: minimalPnl(),
      snapshotDate: "2026-06-08",
      capitalPools: pools({}),
    });

    expect(payload.snapshot_date).toBe("2026-06-08");
    expect(payload.portfolio_value_sgd).toBe(100_000);
    expect(payload.client_current_value_sgd).toBe(15_000);
  });
});
