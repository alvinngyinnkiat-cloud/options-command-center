import { describe, expect, it } from "vitest";
import {
  buildCapitalPoolsBreakdown,
  extractTradingCash,
  isCryptoCashAsset,
  splitCryptoTrackerValues,
} from "./capital-pools";
import type { HoldingInput } from "./types";

describe("capital pools", () => {
  it("identifies crypto cash assets", () => {
    expect(isCryptoCashAsset("USDT")).toBe(true);
    expect(isCryptoCashAsset("BTC")).toBe(false);
    expect(isCryptoCashAsset("ETH", "Cash")).toBe(true);
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
    expect(cash.tradingCashSgd).toBe(16_750);
  });

  it("splits crypto holdings and crypto cash", () => {
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
    expect(split.cryptoHoldingsSgd).toBe(1200);
    expect(split.cryptoCashSgd).toBe(500);
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
    expect(pools.cryptoCashSgd).toBe(3_000);
    expect(pools.cryptoHoldingsSgd).toBe(12_000);
    expect(pools.tradingCapital).toBe(115_000);
    expect(pools.cryptoCapital).toBe(15_000);
    expect(pools.myPortfolioValue).toBe(130_000);
    expect(pools.totalAssetsManaged).toBe(180_000);
    expect(pools.cash.totalCashSgd).toBe(23_000);
  });
});
