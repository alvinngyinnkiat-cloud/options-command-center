import { describe, expect, it } from "vitest";
import {
  resolveManualSgComponents,
  sumManualOverallPortfolioValueSgd,
  sumManualTradingCapitalSgd,
} from "./manual-breakdown";

describe("manual-breakdown", () => {
  it("sums overall portfolio value with trading cash and SG stocks only", () => {
    expect(
      sumManualOverallPortfolioValueSgd({
        usStocksOptionsSgdEquivalent: 27_149.08,
        cryptoValueSgd: 7_689,
        sgStocksValueSgd: 8_000,
        sgCashValueSgd: 1_334,
        tradingCashSgd: 6_914.9,
      })
    ).toBeCloseTo(49_752.98, 2);
  });

  it("sums trading capital excluding crypto and SG cash", () => {
    expect(
      sumManualTradingCapitalSgd({
        usStocksOptionsSgdEquivalent: 27_149.08,
        cryptoValueSgd: 7_689,
        sgStocksValueSgd: 8_000,
        sgCashValueSgd: 1_334,
        tradingCashSgd: 6_914.9,
      })
    ).toBeCloseTo(42_063.98, 2);
  });

  it("falls back to legacy combined SG column", () => {
    expect(
      resolveManualSgComponents({
        useManualOverride: true,
        manualUsStocksOptionsValueUsd: null,
        manualUsStocksOptionsSgdEquivalent: null,
        manualCryptoValueSgd: null,
        manualSgStocksCashValueSgd: 9_334,
        manualSgStocksValueSgd: null,
        manualSgCashValueSgd: null,
        manualTradingCashUsd: null,
        manualTradingCashSgd: null,
        manualCryptoCashSgd: 0,
        manualCryptoHoldingsSgd: null,
        manualCryptoContributionsSgd: null,
        manualClientPortfolioSgd: 0,
        manualUsdSgdRate: 1.35,
        manualTotalPortfolioValueSgd: null,
        overrideReason: null,
        overrideUpdatedAt: null,
      })
    ).toEqual({
      sgStocksValueSgd: 9_334,
      sgCashValueSgd: 0,
      sgCombinedSgd: 9_334,
    });
  });
});
