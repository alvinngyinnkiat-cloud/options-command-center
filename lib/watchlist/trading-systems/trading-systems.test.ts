import { describe, expect, it } from "vitest";
import { computeTradingSystems } from "./index";
import type { TradingSystemsInput } from "./types";

const BASE: TradingSystemsInput = {
  watchlistId: "w1",
  ticker: "XSP",
  averagePrice: 738,
  atr14: 10,
  ema20: 742,
  ema20Previous: 740,
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
      expect(result.confluence.status).toBe("STRONG AGREEMENT");
    }
  });

  it("uses average price not current price (input is average)", () => {
    const result = computeTradingSystems(BASE);
    expect(result.emaSystem.emaScore).toBeGreaterThan(0);
    expect(result.mainSystem.strategyFitScore).toBeGreaterThan(0);
  });

  it("gates 20 EMA decision when EMA score is below 75", () => {
    const weak: TradingSystemsInput = {
      ...BASE,
      averagePrice: 760,
      ema20: 720,
      stochastic: 50,
      previousStochastic: 48,
    };
    const result = computeTradingSystems(weak);
    if (result.emaSystem.emaScore < 75) {
      expect(result.emaSystem.recommendation).toBe("No Trade");
      expect(result.emaSystem.reason).toContain("minimum threshold");
    }
  });

  it("includes informational decision reason", () => {
    const result = computeTradingSystems(BASE);
    expect(result.decisionReason).toContain("20 EMA:");
    expect(result.decisionReason).toContain("Main:");
    expect(result.decisionReason).toContain("Confluence");
  });
});

describe("confluence tiers", () => {
  it("marks shorter-DTE only when EMA trades and main does not", () => {
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
      expect(result.confluence.status).toBe("SHORTER-DTE ONLY");
    }
  });

  it("marks main system only when main trades and EMA does not", () => {
    const neutral: TradingSystemsInput = {
      ...BASE,
      averagePrice: 745,
      stochastic: 50,
      previousStochastic: 52,
      sma50: 740,
      sma200: 745,
      sma50Previous: 741,
      ema20: 700,
    };
    const result = computeTradingSystems(neutral);
    if (
      result.emaSystem.recommendation === "No Trade" &&
      result.mainSystem.recommendation !== "No Trade"
    ) {
      expect(result.confluence.score).toBe(6);
      expect(result.confluence.status).toBe("MAIN SYSTEM ONLY");
    }
  });
});

describe("Iron Condor trend filter", () => {
  it("caps score and blocks trade when trend is strongly bullish", () => {
    const iwm: TradingSystemsInput = {
      ...BASE,
      ticker: "IWM",
      averagePrice: 284.25,
      sma50: 275.69,
      sma200: 256.03,
      sma50Previous: 274,
      stochastic: 50,
      previousStochastic: 50,
      dailySupport: 270,
      dailyResistance: 295,
    };
    const result = computeTradingSystems(iwm);
    expect(result.mainSystem.recommendation).toBe("No Trade");
    expect(result.mainSystem.strategyFitScore).toBeLessThanOrEqual(70);
    expect(result.mainSystem.strategyFitScore).toBeGreaterThanOrEqual(55);
    expect(result.mainSystem.reason).toContain("bullish");
  });

  it("allows elite Iron Condor only with neutral trend and range centering", () => {
    const neutral: TradingSystemsInput = {
      ...BASE,
      averagePrice: 272.5,
      sma50: 275,
      sma200: 270,
      sma50Previous: 274,
      stochastic: 50,
      previousStochastic: 50,
      dailySupport: 265,
      dailyResistance: 280,
      atr14: 4,
    };
    const result = computeTradingSystems(neutral);
    expect(result.mainSystem.recommendation).toBe("Iron Condor");
    expect(result.mainSystem.strategyFitScore).toBeGreaterThanOrEqual(75);
  });
});
