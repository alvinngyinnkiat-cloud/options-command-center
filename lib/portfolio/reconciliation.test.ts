import { describe, expect, it } from "vitest";
import {
  applyManualOverride,
  buildCalculatedValues,
  classifyReconciliationBuckets,
} from "./calculations";
import type { HoldingInput } from "./types";

const holdings: HoldingInput[] = [
  {
    ticker: "AAPL",
    asset_type: "stock",
    currency: "USD",
    market_value_native: 10_000,
    fx_rate_to_sgd: 1.35,
    market_value_sgd: 13_500,
    market_value: 13_500,
    cost_basis: null,
  },
  {
    ticker: "D05",
    asset_type: "stock",
    currency: "SGD",
    market_value_native: 20_000,
    fx_rate_to_sgd: 1,
    market_value_sgd: 20_000,
    market_value: 20_000,
    cost_basis: null,
  },
  {
    ticker: "BTC",
    asset_type: "other",
    currency: "USD",
    market_value_native: 5_000,
    fx_rate_to_sgd: 1.35,
    market_value_sgd: 6_750,
    market_value: 6_750,
    cost_basis: null,
  },
  {
    ticker: "CASH.USD",
    asset_type: "other",
    currency: "USD",
    market_value_native: 2_000,
    fx_rate_to_sgd: 1.35,
    market_value_sgd: 2_700,
    market_value: 2_700,
    cost_basis: null,
  },
  {
    ticker: "CASH",
    asset_type: "other",
    currency: "SGD",
    market_value_native: 3_000,
    fx_rate_to_sgd: 1,
    market_value_sgd: 3_000,
    market_value: 3_000,
    cost_basis: null,
  },
];

describe("portfolio reconciliation", () => {
  it("classifies holdings into reconciliation buckets", () => {
    const buckets = classifyReconciliationBuckets(holdings);
    expect(buckets.usStocksOptionsValueUsd).toBe(12_000);
    expect(buckets.usStocksOptionsSgdEquivalent).toBe(16_200);
    expect(buckets.cryptoValueSgd).toBe(6_750);
    expect(buckets.sgStocksCashValueSgd).toBe(23_000);
    expect(buckets.overallPortfolioValueSgd).toBe(45_950);
  });

  it("uses manual SGD buckets without FX conversion when override is on", () => {
    const calculated = buildCalculatedValues(holdings);
    const { display, comparison } = applyManualOverride(calculated, {
      useManualOverride: true,
      manualUsStocksOptionsValueUsd: 250_000,
      manualUsStocksOptionsSgdEquivalent: 330_000,
      manualCryptoValueSgd: 18_500,
      manualSgStocksCashValueSgd: 78_000,
      manualUsdSgdRate: 1.35,
      manualTotalPortfolioValueSgd: null,
      overrideReason: null,
      overrideUpdatedAt: null,
    });

    expect(display.portfolioValue).toBe(426_500);
    expect(display.usStocksOptionsValueUsd).toBe(250_000);
    expect(comparison.useManualOverride).toBe(true);
    expect(comparison.differenceSgd).toBe(426_500 - calculated.portfolioValue);
  });
});
