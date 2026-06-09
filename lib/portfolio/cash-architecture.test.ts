import { describe, expect, it } from "vitest";
import {
  buildCryptoPortfolioValueSgd,
  buildPortfolioValueSgd,
  buildTotalCashSgd,
  buildTradingCapitalSgd,
} from "./cash-architecture";

describe("cash architecture", () => {
  const components = {
    usEtfValueSgd: 50_000,
    usStockValueSgd: 30_000,
    sgStockValueSgd: 15_000,
    optionsValueSgd: 5_000,
    cryptoHoldingsSgd: 12_000,
    cryptoCashSgd: 3_000,
    tradingCashSgd: 6_915,
  };

  it("crypto portfolio value equals coin holdings plus crypto cash", () => {
    expect(
      buildCryptoPortfolioValueSgd(
        components.cryptoHoldingsSgd,
        components.cryptoCashSgd
      )
    ).toBe(15_000);
  });

  it("portfolio value includes trading cash SGD and crypto portfolio value", () => {
    expect(buildPortfolioValueSgd(components)).toBe(
      50_000 + 30_000 + 15_000 + 5_000 + 12_000 + 3_000 + 6_915
    );
  });

  it("trading capital includes trading cash SGD but excludes crypto", () => {
    expect(
      buildTradingCapitalSgd({
        usEtfValueSgd: components.usEtfValueSgd,
        usStockValueSgd: components.usStockValueSgd,
        sgStockValueSgd: components.sgStockValueSgd,
        tradingCashSgd: components.tradingCashSgd,
        optionsValueSgd: components.optionsValueSgd,
      })
    ).toBe(50_000 + 30_000 + 15_000 + 6_915 + 5_000);
  });

  it("total cash sums SGD buckets only", () => {
    expect(buildTotalCashSgd(6_915, 3_000)).toBe(9_915);
  });
});
