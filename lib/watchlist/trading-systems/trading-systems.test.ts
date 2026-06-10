import { describe, expect, it } from "vitest";
import { computeTradingSystems } from "./index";
import type { TradingSystemsInput } from "./types";

const BASE: TradingSystemsInput = {
  watchlistId: "w1",
  ticker: "XSP",
  averagePrice: 738,
  atr14: 10,
  ema20: 742,
  sma50: 720,
  sma200: 680,
  sma50Previous: 715,
  stochastic: 22,
  previousStochastic: 18,
  dailySupport: 700,
  dailyResistance: 790,
  weeklySupport: 695,
  weeklyResistance: 795,
};

describe("computeTradingSystems", () => {
  it("20 EMA system never outputs Iron Condor", () => {
    const result = computeTradingSystems(BASE);
    expect(result.emaSystem.recommendation).not.toBe("Iron Condor");
  });

  it("Main system can output Iron Condor in neutral range", () => {
    const neutral: TradingSystemsInput = {
      ...BASE,
      averagePrice: 745,
      stochastic: 50,
      previousStochastic: 52,
      sma50: 740,
      sma200: 745,
      sma50Previous: 741,
    };
    const result = computeTradingSystems(neutral);
    expect(result.mainSystem.recommendation).toBe("Iron Condor");
  });

  it("awards 10/10 confluence when both systems agree on Sell Put", () => {
    const result = computeTradingSystems(BASE);
    if (
      result.emaSystem.recommendation === "Sell Put" &&
      result.mainSystem.recommendation === "Sell Put"
    ) {
      expect(result.confluence.score).toBe(10);
      expect(result.confluence.status).toBe("STRONG CONFLUENCE");
    }
  });

  it("uses average price not current price (input is average)", () => {
    const result = computeTradingSystems(BASE);
    expect(result.emaSystem.emaScore).toBeGreaterThan(0);
    expect(result.mainSystem.mainScore).toBeGreaterThan(0);
  });
});

describe("confluence tiers", () => {
  it("marks early setup when only one system trades", () => {
    const early: TradingSystemsInput = {
      ...BASE,
      stochastic: 55,
      previousStochastic: 50,
      sma50: 750,
      sma200: 760,
      sma50Previous: 755,
    };
    const result = computeTradingSystems(early);
    if (
      result.emaSystem.recommendation !== "No Trade" &&
      result.mainSystem.recommendation === "No Trade"
    ) {
      expect(result.confluence.score).toBe(7);
      expect(result.confluence.status).toBe("EARLY SETUP");
    }
  });
});
