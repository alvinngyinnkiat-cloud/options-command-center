import { describe, expect, it } from "vitest";
import {
  buildCapitalPoolsBreakdown,
  extractTradingCash,
  isCryptoCashAsset,
  resolveCryptoCashSgd,
  splitCryptoTrackerValues,
} from "./capital-pools";
import type { HoldingInput } from "./types";

describe("capital pools", () => {
  it("identifies fiat exchange cash only — not stablecoins", () => {
    expect(isCryptoCashAsset("USDT")).toBe(false);
    expect(isCryptoCashAsset("USDC")).toBe(false);
    expect(isCryptoCashAsset("BTC")).toBe(false);
    expect(isCryptoCashAsset("USD")).toBe(true);
    expect(isCryptoCashAsset("SGD")).toBe(true);
    expect(isCryptoCashAsset("CASH")).toBe(true);
    expect(isCryptoCashAsset("ETH", "Exchange Cash SGD")).toBe(true);
  });

  it("extracts trading cash from broker holdings only", () => {
    const holdings: HoldingInput[] = [
      {
        ticker: "CASH",
        asset_type: "other",
        currency: "SGD",
        market_value_native: 10_000,
        fx_rate_to_sgd: 1,
        market_value_sgd: 10_000,
        market_value: 10_000,
        cost_basis: null,
      },
      {
        ticker: "CASH.USD",
        asset_type: "other",
        currency: "USD",
        market_value_native: 5_000,
        fx_rate_to_sgd: 1.35,
        market_value_sgd: 6_750,
        market_value: 6_750,
        cost_basis: null,
      },
    ];
    const cash = extractTradingCash(holdings);
    expect(cash.brokerSgdCash).toBe(10_000);
    expect(cash.brokerUsdCashNative).toBe(5_000);
    expect(cash.tradingCashSgd).toBe(10_000);
  });

  it("uses manual trading cash when provided", () => {
    const pools = buildCapitalPoolsBreakdown({
      holdings: [],
      cryptoRows: [],
      usEtfValueSgd: 0,
      usStockValueSgd: 0,
      sgStockValueSgd: 0,
      openTrades: [],
      clientSummary: {
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
      },
      tradeAllocations: [],
      manualTradingCash: { tradingCashUsd: 18_000, tradingCashSgd: 12_000 },
    });
    expect(pools.tradingCashSgd).toBe(12_000);
    expect(pools.cash.brokerUsdCashNative).toBe(18_000);
    expect(pools.tradingCapital).toBe(12_000);
  });

  it("puts stablecoins in coin holdings, not crypto cash", () => {
    const split = splitCryptoTrackerValues([
      {
        id: "1",
        asset_label: "BTC",
        ticker: "BTC",
        total_invested_sgd: 1000,
        current_value_sgd: 1200,
        notes: null,
        last_updated: "2026-06-06",
        user_id: "u",
        created_at: "",
        updated_at: "",
      },
      {
        id: "2",
        asset_label: "USDT",
        ticker: "USDT",
        total_invested_sgd: 500,
        current_value_sgd: 500,
        notes: null,
        last_updated: "2026-06-06",
        user_id: "u",
        created_at: "",
        updated_at: "",
      },
    ]);
    expect(split.cryptoHoldingsSgd).toBe(1700);
    expect(split.cryptoCashSgd).toBe(0);
  });

  it("prefers manual crypto cash override over tracker split", () => {
    expect(
      resolveCryptoCashSgd(
        {
          useManualOverride: false,
          manualUsStocksOptionsValueUsd: null,
          manualUsStocksOptionsSgdEquivalent: null,
          manualCryptoValueSgd: null,
          manualSgStocksCashValueSgd: null,
          manualTradingCashUsd: null,
          manualTradingCashSgd: null,
          manualCryptoCashSgd: 2_500,
          manualCryptoHoldingsSgd: null,
          manualCryptoContributionsSgd: null,
          manualUsdSgdRate: 1.35,
          manualTotalPortfolioValueSgd: null,
          overrideReason: null,
          overrideUpdatedAt: null,
        },
        500
      )
    ).toBe(2_500);

    const pools = buildCapitalPoolsBreakdown({
      holdings: [],
      cryptoRows: [
        {
          id: "2",
          asset_label: "USDT",
          ticker: "USDT",
          total_invested_sgd: 500,
          current_value_sgd: 500,
          notes: null,
          last_updated: "2026-06-06",
          user_id: "u",
          created_at: "",
          updated_at: "",
        },
      ],
      usEtfValueSgd: 50_000,
      usStockValueSgd: 30_000,
      sgStockValueSgd: 15_000,
      openTrades: [],
      clientSummary: {
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
      },
      tradeAllocations: [],
      portfolioOverride: {
        useManualOverride: false,
        manualUsStocksOptionsValueUsd: null,
        manualUsStocksOptionsSgdEquivalent: null,
        manualCryptoValueSgd: null,
        manualSgStocksCashValueSgd: null,
        manualTradingCashUsd: null,
        manualTradingCashSgd: 6_915,
        manualCryptoCashSgd: 3_000,
        manualCryptoHoldingsSgd: null,
        manualCryptoContributionsSgd: null,
        manualUsdSgdRate: 1.35,
        manualTotalPortfolioValueSgd: null,
        overrideReason: null,
        overrideUpdatedAt: null,
      },
    });

    expect(pools.cryptoCashSgd).toBe(3_000);
    expect(pools.cryptoHoldingsSgd).toBe(500);
    expect(pools.cryptoPortfolioValueSgd).toBe(3_500);
    expect(pools.tradingCapital).toBe(95_000);
    expect(pools.myPortfolioValue).toBe(98_500);
  });

  it("builds trading and crypto capital separately", () => {
    const pools = buildCapitalPoolsBreakdown({
      holdings: [
        {
          ticker: "CASH",
          asset_type: "other",
          currency: "SGD",
          market_value_native: 20_000,
          fx_rate_to_sgd: 1,
          market_value_sgd: 20_000,
          market_value: 20_000,
          cost_basis: null,
        },
      ],
      cryptoRows: [
        {
          id: "btc",
          asset_label: "BTC",
          ticker: "BTC",
          total_invested_sgd: 10_000,
          current_value_sgd: 12_000,
          notes: null,
          last_updated: "2026-06-06",
          user_id: "u",
          created_at: "",
          updated_at: "",
        },
        {
          id: "usdt",
          asset_label: "USDT",
          ticker: "USDT",
          total_invested_sgd: 3_000,
          current_value_sgd: 3_000,
          notes: null,
          last_updated: "2026-06-06",
          user_id: "u",
          created_at: "",
          updated_at: "",
        },
      ],
      usEtfValueSgd: 50_000,
      usStockValueSgd: 30_000,
      sgStockValueSgd: 15_000,
      openTrades: [],
      clientSummary: {
        totalClientCapital: 50_000,
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
      },
      tradeAllocations: [],
    });

    expect(pools.tradingCashSgd).toBe(20_000);
    expect(pools.cryptoCashSgd).toBe(0);
    expect(pools.cryptoHoldingsSgd).toBe(15_000);
    expect(pools.tradingCapital).toBe(115_000);
    expect(pools.cryptoPortfolioValueSgd).toBe(15_000);
    expect(pools.cryptoCapital).toBe(15_000);
    expect(pools.appCalculatedValueSgd).toBe(130_000);
    expect(pools.manualOverallPortfolioValueSgd).toBeNull();
    expect(pools.portfolioValueSource).toBe("app");
    expect(pools.myPortfolioValue).toBe(130_000);
    expect(pools.totalAssetsManaged).toBe(180_000);
    expect(pools.cash.totalCashSgd).toBe(20_000);
  });
});
