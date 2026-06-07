import { describe, expect, it } from "vitest";
import { computeScannerScore } from "@/lib/watchlist/scoring/compute";
import { BULL_PUT_PERFECT_FIXTURE } from "@/lib/watchlist/scoring/fixtures";
import { computeStrategyRecommendation } from "./compute";
import {
  BEAR_CALL_RECOMMENDATION_INPUT,
  BULL_PUT_RECOMMENDATION_INPUT,
  IRON_CONDOR_RECOMMENDATION_INPUT,
} from "./fixtures";

describe("computeStrategyRecommendation", () => {
  it("recommends Bull Put when all bull put rules pass", () => {
    const result = computeStrategyRecommendation(BULL_PUT_RECOMMENDATION_INPUT);
    expect(result.recommendedStrategy).toBe("Bull Put");
    expect(result.recommendedStrategyType).toBe("bull_put_spread");
    expect(result.totalScore).toBe(100);
    expect(result.decisionLabel).toBe("Trade Immediately");
    expect(result.ruleChecks.every((r) => r.passed)).toBe(true);
    expect(result.ruleChecks.some((r) => r.rule === "Premium")).toBe(false);
  });

  it("recommends Bear Call when all bear call rules pass", () => {
    const result = computeStrategyRecommendation(BEAR_CALL_RECOMMENDATION_INPUT);
    expect(result.recommendedStrategy).toBe("Bear Call");
    expect(result.recommendedStrategyType).toBe("bear_call_spread");
    expect(result.totalScore).toBe(100);
  });

  it("recommends Iron Condor when all iron condor rules pass", () => {
    const result = computeStrategyRecommendation(IRON_CONDOR_RECOMMENDATION_INPUT);
    expect(result.recommendedStrategy).toBe("Iron Condor");
    expect(result.recommendedStrategyType).toBe("iron_condor");
    expect(result.totalScore).toBe(100);
  });

  it("returns No Trade when score is below 80", () => {
    const score = computeScannerScore(BULL_PUT_PERFECT_FIXTURE);
    const lowScore = { ...score, totalScore: 75, decisionLabel: "Watchlist" as const };
    const result = computeStrategyRecommendation({
      ...BULL_PUT_RECOMMENDATION_INPUT,
      score: lowScore,
    });
    expect(result.recommendedStrategy).toBe("No Trade");
    expect(result.recommendedStrategyType).toBeNull();
    expect(result.primaryReason).toContain("below 80");
  });

  it("returns No Trade when manual support is missing for Bull Put", () => {
    const result = computeStrategyRecommendation({
      ...BULL_PUT_RECOMMENDATION_INPUT,
      support: null,
    });
    expect(result.recommendedStrategy).toBe("No Trade");
    expect(result.warningNotes.some((w) => w.includes("support"))).toBe(true);
  });

  it("includes score breakdown without premium", () => {
    const result = computeStrategyRecommendation(BULL_PUT_RECOMMENDATION_INPUT);
    expect(result.scoreBreakdown).toHaveLength(4);
    expect(result.scoreBreakdown.map((b) => b.category)).not.toContain("Premium");
    expect(result.scoreBreakdown.reduce((s, b) => s + b.score, 0)).toBe(100);
  });

  it("does not auto-recommend sell put or sell call", () => {
    const result = computeStrategyRecommendation({
      ...BULL_PUT_RECOMMENDATION_INPUT,
      usdCashNative: 100_000,
      sharesOwned: 500,
    });
    expect(result.recommendedStrategy).toBe("Bull Put");
    expect(result.recommendedStrategyType).not.toBe("sell_put");
    expect(result.recommendedStrategyType).not.toBe("sell_call");
  });

  it("marks sell put eligible when bull put passes and cash covers assignment", () => {
    const result = computeStrategyRecommendation({
      ...BULL_PUT_RECOMMENDATION_INPUT,
      usdCashNative: 60_000,
    });
    expect(result.sellPutEligible).toBe(true);
    expect(result.sellPutReason).toContain("Sell Put Eligible");
  });

  it("marks sell call eligible when bear call passes and shares >= 100", () => {
    const result = computeStrategyRecommendation({
      ...BEAR_CALL_RECOMMENDATION_INPUT,
      sharesOwned: 150,
    });
    expect(result.sellCallEligible).toBe(true);
    expect(result.sellCallReason).toContain("Sell Call Eligible");
  });
});
