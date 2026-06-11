import { describe, expect, it } from "vitest";
import {
  portfolioTradingCashTotals,
  tradingCashFromStoredBalances,
} from "./trading-cash-sync";

describe("tradingCashFromStoredBalances", () => {
  it("returns stored bucket values without portfolio inference", () => {
    const stored = { us_etf: 100, us_stock: 200, sg_stock: 300 };
    expect(tradingCashFromStoredBalances(stored)).toEqual(stored);
  });

  it("clamps negative values to zero", () => {
    expect(
      tradingCashFromStoredBalances({ us_etf: -1, us_stock: 0, sg_stock: 5 })
    ).toEqual({ us_etf: 0, us_stock: 0, sg_stock: 5 });
  });
});

describe("portfolioTradingCashTotals", () => {
  it("reads manual portfolio override totals as reference only", () => {
    expect(
      portfolioTradingCashTotals({
        manualTradingCashUsd: 18_000,
        manualTradingCashSgd: 24_336,
      })
    ).toEqual({ tradingCashUsd: 18_000, tradingCashSgd: 24_336 });
  });
});
