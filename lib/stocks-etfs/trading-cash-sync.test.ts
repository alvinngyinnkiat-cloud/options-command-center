import { describe, expect, it } from "vitest";
import { deriveTradingCashFromPortfolio, resolveDisplayTradingCash } from "./trading-cash-sync";

describe("resolveDisplayTradingCash", () => {
  it("uses portfolio values when no ledger activity and stored is zero", () => {
    const stored = { us_etf: 0, us_stock: 0, sg_stock: 0 };
    const portfolio = { us_etf: 9000, us_stock: 9000, sg_stock: 24336 };
    expect(resolveDisplayTradingCash(stored, portfolio, false)).toEqual(portfolio);
  });

  it("uses stored values when ledger has activity", () => {
    const stored = { us_etf: 100, us_stock: 200, sg_stock: 300 };
    const portfolio = { us_etf: 9000, us_stock: 9000, sg_stock: 24336 };
    expect(resolveDisplayTradingCash(stored, portfolio, true)).toEqual(stored);
  });
});

describe("deriveTradingCashFromPortfolio", () => {
  it("maps Trading Cash USD to US ETF and US Stock buckets (50/50)", () => {
    const result = deriveTradingCashFromPortfolio({
      manualTradingCashUsd: 10_000,
      manualTradingCashSgd: 0,
    });
    expect(result.us_etf).toBe(5_000);
    expect(result.us_stock).toBe(5_000);
    expect(result.sg_stock).toBe(0);
  });

  it("maps Trading Cash SGD to SG Stock bucket", () => {
    const result = deriveTradingCashFromPortfolio({
      manualTradingCashUsd: 0,
      manualTradingCashSgd: 24_336,
    });
    expect(result.us_etf).toBe(0);
    expect(result.us_stock).toBe(0);
    expect(result.sg_stock).toBe(24_336);
  });

  it("does not use SG stock value fields", () => {
    const result = deriveTradingCashFromPortfolio({
      manualTradingCashUsd: 18_000,
      manualTradingCashSgd: 24_336,
    });
    expect(result.us_etf).toBe(9_000);
    expect(result.us_stock).toBe(9_000);
    expect(result.sg_stock).toBe(24_336);
  });
});
