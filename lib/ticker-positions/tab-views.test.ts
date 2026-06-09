import { describe, expect, it } from "vitest";
import type { MarketPerformanceReport } from "./market-types";
import {
  buildPassiveIncomeGoalProgress,
  buildTabLeaderboards,
  filterIncomeRows,
  filterUnifiedRowsByTab,
  getMarketTabHeader,
  summarizeAllMarket,
} from "./tab-views";
import type { SgMarketTickerRow, UsMarketTickerRow } from "./market-types";

const usRow = (ticker: string): UsMarketTickerRow => ({
  ticker,
  category: "US ETF",
  marketCategory: "us_etf",
  currentValue: 10_000,
  capitalDeployed: 8_000,
  premiumCollected: 500,
  dividendIncome: 200,
  annualPremiumIncome: 300,
  annualDividendIncome: 400,
  incomeYieldPct: 8.75,
  adjustedCostBasis: 8_000,
  realizedPnl: 100,
  unrealizedPnl: 200,
  totalPnl: 700,
  roiPct: 8.75,
  openTradesCount: 1,
  closedTradesCount: 2,
});

const sgRow = (ticker: string): SgMarketTickerRow => ({
  ticker,
  category: "SG Stock",
  currentValue: 5_000,
  capitalDeployed: 4_000,
  dividendIncome: 150,
  annualDividendIncome: 180,
  dividendYield: 3.6,
  incomeYieldPct: 4.5,
  adjustedCostBasis: 4_000,
  realizedPnl: 0,
  unrealizedPnl: 50,
  totalPnl: 200,
  roiPct: 5,
});

const emptyReport: MarketPerformanceReport = {
  usTopPerformers: [],
  usWorstPerformers: [],
  sgTopPerformers: [],
  sgWorstPerformers: [],
  usPremiumByTicker: [],
  usDividendByTicker: [],
  sgDividendByTicker: [],
  usHighestIncomeYield: [],
  sgHighestIncomeYield: [],
  topPremiumGenerators: [],
  topDividendGenerators: [],
  topPassiveIncomeGenerators: [],
};

describe("tab views", () => {
  it("returns tab headers", () => {
    expect(getMarketTabHeader("all")).toBe("All Markets");
    expect(getMarketTabHeader("income")).toBe("Income Dashboard");
  });

  it("filters unified rows by tab", () => {
    const us = [usRow("SPY")];
    const sg = [sgRow("DBS")];
    expect(filterUnifiedRowsByTab("all", us, sg)).toHaveLength(2);
    expect(filterUnifiedRowsByTab("us", us, sg)).toHaveLength(1);
    expect(filterUnifiedRowsByTab("sg", us, sg)[0].ticker).toBe("DBS");
  });

  it("summarizes all markets", () => {
    const us = [usRow("SPY")];
    const sg = [sgRow("DBS")];
    const summary = summarizeAllMarket(
      us,
      sg,
      {
        totalMarketValue: 10_000,
        totalPremiumCollected: 500,
        totalDividendIncome: 200,
        totalPassiveIncome: 700,
        averageIncomeYieldPct: 8,
        totalPnl: 700,
        totalCapitalDeployed: 8_000,
        totalAnnualPremiumIncome: 300,
        totalAnnualDividendIncome: 400,
        bestTicker: { ticker: "SPY", totalPnl: 700 },
        worstTicker: { ticker: "SPY", totalPnl: 700 },
      },
      {
        totalMarketValue: 5_000,
        totalDividendIncome: 150,
        totalPassiveIncome: 150,
        averageIncomeYieldPct: 4,
        totalPnl: 200,
        totalCapitalDeployed: 4_000,
        totalAnnualDividendIncome: 180,
        bestTicker: { ticker: "DBS", totalPnl: 200 },
        worstTicker: { ticker: "DBS", totalPnl: 200 },
      }
    );
    expect(summary.totalMarketValue).toBe(15_000);
    expect(summary.totalPremiumCollected).toBe(500);
    expect(summary.bestTicker?.ticker).toBe("SPY");
  });

  it("hides premium leaderboard on SG tab", () => {
    const boards = buildTabLeaderboards("sg", emptyReport, [usRow("SPY")], [sgRow("DBS")]);
    expect(boards.showPremiumGenerators).toBe(false);
    expect(boards.showDividendGenerators).toBe(true);
  });

  it("filters income rows premium only", () => {
    const rows = filterUnifiedRowsByTab("income", [usRow("SPY")], [sgRow("DBS")]);
    const premiumOnly = filterIncomeRows(rows, "premium");
    expect(premiumOnly).toHaveLength(1);
    expect(premiumOnly[0].ticker).toBe("SPY");
  });

  it("builds passive income goal progress", () => {
    const goal = buildPassiveIncomeGoalProgress(
      {
        totalAnnualPremiumIncome: 1_200,
        totalAnnualDividendIncome: 600,
      } as never,
      { totalAnnualDividendIncome: 600 } as never,
      10_000
    );
    expect(goal.currentMonthlySgd).toBeCloseTo(200, 0);
    expect(goal.progressPercent).toBeCloseTo(2, 0);
    expect(goal.remainingMonthlySgd).toBeCloseTo(9800, 0);
  });
});
