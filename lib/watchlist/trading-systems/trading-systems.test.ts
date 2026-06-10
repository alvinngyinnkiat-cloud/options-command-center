import { describe, expect, it } from "vitest";
import { computeTradingSystems } from "./index";
import { computeConfluence } from "./confluence-engine";
import type { TradingSystemsInput } from "./types";

const BASE: TradingSystemsInput = {
  watchlistId: "w1",
  ticker: "XSP",
  averagePrice: 738,
  previousAveragePrice: 735,
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

describe("computeTradingSystems V3", () => {
  it("20 EMA system never outputs Iron Condor", () => {
    expect(computeTradingSystems(BASE).emaSystem.recommendation).not.toBe(
      "Iron Condor"
    );
  });

  it("confluence is status-only", () => {
    const result = computeTradingSystems(BASE);
    expect(result.confluence.status).toMatch(
      /Both Systems Agree|One System Agree|No System Agree/
    );
    expect(result.confluence).not.toHaveProperty("score");
  });

  it("decision reason excludes numeric confluence", () => {
    const result = computeTradingSystems(BASE);
    expect(result.decisionReason).not.toMatch(/\/10/);
    expect(result.decisionReason).toContain("Confluence");
  });
});

describe("computeConfluence", () => {
  it("Both Systems Agree when both recommend", () => {
    const result = computeConfluence(
      {
        recommendation: "Sell Put",
        emaScore: 80,
        tier: "Good Reversal",
        reason: "test",
        baseSrSignal: "Sell Put",
        emaDifference: 1,
        emaDifferencePct: 0.5,
        momentumStatus: "STRONG",
      },
      {
        recommendation: "Sell Put",
        strategyFitScore: 80,
        tier: "Good Setup",
        reason: "test",
      }
    );
    expect(result.status).toBe("Both Systems Agree");
  });

  it("No System Agree when both idle", () => {
    const result = computeConfluence(
      {
        recommendation: "No Trade",
        emaScore: 40,
        tier: "No Trade",
        reason: "test",
        baseSrSignal: "No Trade",
        emaDifference: 0,
        emaDifferencePct: 0,
        momentumStatus: "STRONG",
      },
      {
        recommendation: "No Trade",
        strategyFitScore: 40,
        tier: "No Trade",
        reason: "test",
      }
    );
    expect(result.status).toBe("No System Agree");
  });
});
