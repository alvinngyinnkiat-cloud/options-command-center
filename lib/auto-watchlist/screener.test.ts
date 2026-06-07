import { describe, expect, it } from "vitest";
import { calculateDistanceFromHighPercent } from "./calculations";
import { buildAutoWatchlistCategories } from "./screener";
import type { MarketCapSnapshot } from "./types";

const universe: MarketCapSnapshot[] = [
  {
    ticker: "A", companyName: "A", marketCapBillions: 300, sector: "Technology",
    currentPrice: 100, oneYearPerformancePercent: 10,
    fiftyTwoWeekHigh: 110, fiftyTwoWeekLow: 80,
  },
  {
    ticker: "B", companyName: "B", marketCapBillions: 250, sector: "Technology",
    currentPrice: 50, oneYearPerformancePercent: -5,
    fiftyTwoWeekHigh: 60, fiftyTwoWeekLow: 40,
  },
  {
    ticker: "C", companyName: "C", marketCapBillions: 150, sector: "Financials",
    currentPrice: 30, oneYearPerformancePercent: -8,
    fiftyTwoWeekHigh: 35, fiftyTwoWeekLow: 25,
  },
  {
    ticker: "D", companyName: "D", marketCapBillions: 25, sector: "Consumer",
    currentPrice: 20, oneYearPerformancePercent: -12,
    fiftyTwoWeekHigh: 28, fiftyTwoWeekLow: 15,
  },
];

describe("auto watchlist screener", () => {
  it("calculates distance from high", () => {
    expect(calculateDistanceFromHighPercent(90, 100)).toBe(-10);
  });

  it("builds four categories with correct limits", () => {
    const cats = buildAutoWatchlistCategories(universe, "2026-06-06T00:00:00Z");
    expect(cats).toHaveLength(4);
    expect(cats[0].entries.map((e) => e.ticker)).toEqual(["A", "B"]);
    expect(cats[1].entries.map((e) => e.ticker)).toEqual(["B"]);
    expect(cats[2].entries.map((e) => e.ticker)).toEqual(["C"]);
    expect(cats[3].entries.map((e) => e.ticker)).toEqual(["D"]);
  });
});
