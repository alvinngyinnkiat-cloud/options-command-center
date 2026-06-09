import { describe, expect, it } from "vitest";
import { buildCapitalPoolsBreakdown } from "./capital-pools";
import {
  buildAppCalculatedPortfolioValue,
  buildSectionPortfolioValueSgd,
  resolveActivePortfolioValueSgd,
  resolveBrokerReferencePortfolioValueSgd,
} from "./reconciliation";
import type { PortfolioOverrideInput } from "./types";

const emptyClientSummary = {
  totalClientCapital: 0,
  allocatedTradesCount: 0,
  totalClientProfit: 0,
  totalClientLoss: 0,
  totalClientNetPl: 0,
  totalMySharePl: 0,
  clientSharePaid: 0,
  clientShareOwed: 0,
  totalPaidToClient: 0,
  outstandingAmountOwed: 0,
  lifetimeTradeProfit: 0,
  lifetimeClientShare: 0,
  lifetimeMyShare: 0,
};

describe("portfolio reconciliation", () => {
  it("builds app calculated value from module components", () => {
    expect(
      buildAppCalculatedPortfolioValue({
        usEtfValueSgd: 50_000,
        usStockValueSgd: 30_000,
        sgStockValueSgd: 15_000,
        optionsValueSgd: 5_000,
        cryptoHoldingsSgd: 12_000,
        cryptoCashSgd: 3_000,
        tradingCashSgd: 20_000,
      })
    ).toBe(135_000);
  });

  it("section portfolio value includes trading cash SGD once", () => {
    const override: PortfolioOverrideInput = {
      useManualOverride: true,
      manualUsStocksOptionsValueUsd: 250_000,
      manualUsStocksOptionsSgdEquivalent: 330_000,
      manualCryptoValueSgd: 18_500,
      manualSgStocksCashValueSgd: 78_000,
      manualSgStocksValueSgd: null,
      manualSgCashValueSgd: null,
      manualTradingCashUsd: 15_000,
      manualTradingCashSgd: 20_000,
      manualCryptoCashSgd: 0,
      manualCryptoHoldingsSgd: null,
      manualCryptoContributionsSgd: null,
      manualClientPortfolioSgd: 0,
      manualUsdSgdRate: 1.35,
      manualTotalPortfolioValueSgd: 426_500,
      overrideReason: null,
      overrideUpdatedAt: null,
    };

    expect(resolveBrokerReferencePortfolioValueSgd(override)).toBe(426_500);

    const pools = buildCapitalPoolsBreakdown({
      holdings: [],
      cryptoRows: [
        {
          id: "usdt",
          asset_label: "USDT",
          ticker: "USDT",
          total_invested_sgd: 500,
          current_value_sgd: 500,
          notes: null,
          last_updated: "2026-06-08",
          user_id: "u",
          created_at: "",
          updated_at: "",
        },
      ],
      usEtfValueSgd: 50_000,
      usStockValueSgd: 30_000,
      sgStockValueSgd: 15_000,
      openTrades: [],
      clientSummary: emptyClientSummary,
      tradeAllocations: [],
      manualTradingCash: { tradingCashUsd: 15_000, tradingCashSgd: 20_000 },
      portfolioOverride: override,
    });

    expect(pools.cryptoCashSgd).toBe(0);
    expect(pools.cryptoHoldingsSgd).toBe(500);
    expect(pools.appCalculatedValueSgd).toBe(115_500);
    expect(pools.totalPortfolioSgd).toBe(428_500);
    expect(pools.myPortfolioValue).toBe(428_500);
    expect(pools.myPortfolioValue).toBe(
      330_000 + 500 + 78_000 + 20_000
    );
    expect(pools.portfolioValueDifferenceSgd).toBe(426_500 - 428_500);
    expect(pools.portfolioValueSource).toBe("sections");
    expect(pools.tradingCapital).toBe(330_000 + 20_000 + 78_000);
  });

  it("uses manual trading capital excluding crypto with split SG", () => {
    const pools = buildCapitalPoolsBreakdown({
      holdings: [],
      cryptoRows: [],
      usEtfValueSgd: 0,
      usStockValueSgd: 0,
      sgStockValueSgd: 0,
      openTrades: [],
      clientSummary: emptyClientSummary,
      tradeAllocations: [],
      manualTradingCash: { tradingCashUsd: 1_000, tradingCashSgd: 6_914.9 },
      portfolioOverride: {
        useManualOverride: true,
        manualUsStocksOptionsValueUsd: 15_675.89,
        manualUsStocksOptionsSgdEquivalent: 27_149.08,
        manualCryptoValueSgd: 7_689,
        manualSgStocksCashValueSgd: null,
        manualSgStocksValueSgd: 8_000,
        manualSgCashValueSgd: 1_334,
        manualTradingCashUsd: 1_000,
        manualTradingCashSgd: 6_914.9,
        manualCryptoCashSgd: 0,
        manualCryptoHoldingsSgd: null,
        manualCryptoContributionsSgd: null,
        manualClientPortfolioSgd: 0,
        manualUsdSgdRate: 1.35,
        manualTotalPortfolioValueSgd: null,
        overrideReason: null,
        overrideUpdatedAt: null,
      },
    });

    expect(pools.tradingCapital).toBeCloseTo(42_063.98, 2);
    expect(pools.totalPortfolioSgd).toBeCloseTo(42_063.98, 2);
  });

  it("uses tracker modules when manual reconciliation is off", () => {
    expect(resolveActivePortfolioValueSgd(130_000)).toBe(130_000);

    const pools = buildCapitalPoolsBreakdown({
      holdings: [],
      cryptoRows: [],
      usEtfValueSgd: 50_000,
      usStockValueSgd: 30_000,
      sgStockValueSgd: 15_000,
      openTrades: [],
      clientSummary: emptyClientSummary,
      tradeAllocations: [],
      manualTradingCash: { tradingCashUsd: 0, tradingCashSgd: 20_000 },
      portfolioOverride: null,
    });

    expect(pools.totalPortfolioSgd).toBe(115_000);
    expect(pools.myPortfolioValue).toBe(115_000);
    expect(pools.portfolioValueSource).toBe("app");
  });

  it("splits ownership when client portfolio is set", () => {
    const pools = buildCapitalPoolsBreakdown({
      holdings: [],
      cryptoRows: [],
      usEtfValueSgd: 50_000,
      usStockValueSgd: 30_000,
      sgStockValueSgd: 15_000,
      openTrades: [],
      clientSummary: emptyClientSummary,
      tradeAllocations: [],
      manualTradingCash: { tradingCashUsd: 0, tradingCashSgd: 20_000 },
      portfolioOverride: {
        useManualOverride: false,
        manualUsStocksOptionsValueUsd: null,
        manualUsStocksOptionsSgdEquivalent: null,
        manualCryptoValueSgd: null,
        manualSgStocksCashValueSgd: null,
        manualSgStocksValueSgd: null,
        manualSgCashValueSgd: null,
        manualTradingCashUsd: null,
        manualTradingCashSgd: 20_000,
        manualCryptoCashSgd: 0,
        manualCryptoHoldingsSgd: null,
        manualCryptoContributionsSgd: null,
        manualClientPortfolioSgd: 15_000,
        manualUsdSgdRate: 1.35,
        manualTotalPortfolioValueSgd: null,
        overrideReason: null,
        overrideUpdatedAt: null,
      },
    });

    expect(pools.totalPortfolioSgd).toBe(115_000);
    expect(pools.clientPortfolioSgd).toBe(15_000);
    expect(pools.myPortfolioValue).toBe(100_000);
    expect(pools.clientOwnershipPct).toBeCloseTo(13.0, 1);
    expect(pools.myOwnershipPct).toBeCloseTo(87.0, 1);
  });

  it("tallies broker-style section entry with trading cash", () => {
    const sectionTotal = buildSectionPortfolioValueSgd({
      usEtfValueSgd: 0,
      usStockValueSgd: 0,
      sgStockValueSgd: 0,
      optionsValueSgd: 0,
      cryptoHoldingsSgd: 0,
      cryptoCashSgd: 0,
      tradingCashSgd: 6_914.9,
      portfolioOverride: {
        useManualOverride: true,
        manualUsStocksOptionsValueUsd: 15_675.89,
        manualUsStocksOptionsSgdEquivalent: 27_149.08,
        manualCryptoValueSgd: 0,
        manualSgStocksCashValueSgd: 9_334,
        manualTradingCashUsd: 1_000,
        manualTradingCashSgd: 6_914.9,
        manualCryptoCashSgd: 0,
        manualUsdSgdRate: 1.35,
        manualTotalPortfolioValueSgd: 36_483.08,
        overrideReason: null,
        overrideUpdatedAt: null,
      },
    });

    expect(sectionTotal).toBe(27_149.08 + 9_334 + 6_914.9);
  });

  it("uses computed crypto portfolio value from coin rows and exchange cash", () => {
    const sectionTotal = buildSectionPortfolioValueSgd({
      usEtfValueSgd: 0,
      usStockValueSgd: 0,
      sgStockValueSgd: 0,
      optionsValueSgd: 0,
      cryptoHoldingsSgd: 7_000,
      cryptoCashSgd: 500,
      tradingCashSgd: 6_914.9,
      portfolioOverride: {
        useManualOverride: true,
        manualUsStocksOptionsValueUsd: null,
        manualUsStocksOptionsSgdEquivalent: 27_149.08,
        manualCryptoValueSgd: 7_689,
        manualSgStocksCashValueSgd: 9_334,
        manualTradingCashUsd: null,
        manualTradingCashSgd: 6_914.9,
        manualCryptoCashSgd: 3_000,
        manualCryptoHoldingsSgd: null,
        manualCryptoContributionsSgd: null,
        manualClientPortfolioSgd: 0,
        manualUsdSgdRate: 1.35,
        manualTotalPortfolioValueSgd: null,
        overrideReason: null,
        overrideUpdatedAt: null,
      },
    });

    expect(sectionTotal).toBe(27_149.08 + 10_000 + 9_334 + 6_914.9);
  });
});
