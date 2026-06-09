import { describe, expect, it } from "vitest";
import { groupAllMarketRows, groupUsMarketRows } from "./group-rows";
import type { SgMarketTickerRow, UsMarketTickerRow } from "./market-types";

const us = (category: UsMarketTickerRow["marketCategory"], ticker: string): UsMarketTickerRow =>
  ({
    ticker,
    category: ticker,
    marketCategory: category,
    currentValue: 1000,
    capitalDeployed: 800,
    premiumCollected: 0,
    dividendIncome: 0,
    annualPremiumIncome: 0,
    annualDividendIncome: 0,
    incomeYieldPct: 0,
    adjustedCostBasis: 800,
    realizedPnl: 0,
    unrealizedPnl: 0,
    totalPnl: 0,
    roiPct: 0,
    openTradesCount: 0,
    closedTradesCount: 0,
  }) as UsMarketTickerRow;

const sg = (ticker: string): SgMarketTickerRow =>
  ({
    ticker,
    category: "SG Stock",
    currentValue: 500,
    capitalDeployed: 400,
    dividendIncome: 0,
    annualDividendIncome: 0,
    dividendYield: null,
    incomeYieldPct: 0,
    adjustedCostBasis: 400,
    realizedPnl: 0,
    unrealizedPnl: 0,
    totalPnl: 0,
    roiPct: 0,
  }) as SgMarketTickerRow;

describe("group-rows", () => {
  it("splits US rows into ETF, stock, and options", () => {
    const groups = groupUsMarketRows([
      us("us_etf", "SPY"),
      us("us_stock", "AAPL"),
      us("us_options", "AAPL"),
    ]);
    expect(groups.etf.map((r) => r.ticker)).toEqual(["SPY"]);
    expect(groups.stock.map((r) => r.ticker)).toEqual(["AAPL"]);
    expect(groups.options.map((r) => r.ticker)).toEqual(["AAPL"]);
  });

  it("groups ALL tab rows with SG holdings", () => {
    const groups = groupAllMarketRows(
      [us("us_etf", "VOO")],
      [sg("DBS")]
    );
    expect(groups.etf).toHaveLength(1);
    expect(groups.sg).toHaveLength(1);
  });
});
