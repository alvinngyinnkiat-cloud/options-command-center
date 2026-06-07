import { describe, expect, it } from "vitest";
import { getDecisionLabel } from "./decision";
import { computeScannerScore } from "./compute";
import { SCORE_WEIGHTS } from "./types";
import {
  BEAR_CALL_PERFECT_FIXTURE,
  BULL_PUT_PERFECT_FIXTURE,
  IRON_CONDOR_PERFECT_FIXTURE,
  NO_SR_FIXTURE,
} from "./fixtures";

describe("decision labels", () => {
  it("maps score bands correctly on 100-point scale", () => {
    expect(getDecisionLabel(90)).toBe("Trade Immediately");
    expect(getDecisionLabel(85)).toBe("Strong Candidate");
    expect(getDecisionLabel(80)).toBe("Strong Candidate");
    expect(getDecisionLabel(75)).toBe("Watchlist");
    expect(getDecisionLabel(70)).toBe("Watchlist");
    expect(getDecisionLabel(69)).toBe("No Trade");
  });
});

describe("computeScannerScore", () => {
  it("scores a perfect Bull Put candidate at 100", () => {
    const result = computeScannerScore(BULL_PUT_PERFECT_FIXTURE);
    expect(result.candidateStrategy).toBe("bull_put_spread");
    expect(result.trend.score).toBe(SCORE_WEIGHTS.trend);
    expect(result.stochastic.score).toBe(SCORE_WEIGHTS.stochastic);
    expect(result.ema20.score).toBe(SCORE_WEIGHTS.ema20);
    expect(result.supportResistance.score).toBe(SCORE_WEIGHTS.supportResistance);
    expect(result.totalScore).toBe(100);
    expect(result.decisionLabel).toBe("Trade Immediately");
  });

  it("scores a perfect Bear Call candidate at 100", () => {
    const result = computeScannerScore(BEAR_CALL_PERFECT_FIXTURE);
    expect(result.candidateStrategy).toBe("bear_call_spread");
    expect(result.totalScore).toBe(100);
    expect(result.decisionLabel).toBe("Trade Immediately");
  });

  it("scores a perfect Iron Condor candidate at 100", () => {
    const result = computeScannerScore(IRON_CONDOR_PERFECT_FIXTURE);
    expect(result.candidateStrategy).toBe("iron_condor");
    expect(result.totalScore).toBe(100);
    expect(result.decisionLabel).toBe("Trade Immediately");
  });

  it("fails S/R when manual levels are missing", () => {
    const result = computeScannerScore(NO_SR_FIXTURE);
    expect(result.supportResistance.passed).toBe(false);
    expect(result.supportResistance.score).toBe(0);
    expect(result.supportResistance.reason).toContain("Manual support required");
  });
});
