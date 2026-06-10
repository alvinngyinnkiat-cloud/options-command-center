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
  it("excludes EMA20 from component total (EMA scored in reversal system)", () => {
    const result = computeScannerScore(BULL_PUT_PERFECT_FIXTURE);
    expect(result.ema20.score).toBeGreaterThan(0);
    expect(result.totalScore).toBe(
      result.trend.score +
        result.stochastic.score +
        result.supportResistance.score
    );
    expect(result.totalScore).toBeLessThanOrEqual(
      SCORE_WEIGHTS.trend +
        SCORE_WEIGHTS.stochastic +
        SCORE_WEIGHTS.supportResistance
    );
  });

  it("scores trend and stochastic for bull put fixture", () => {
    const result = computeScannerScore(BULL_PUT_PERFECT_FIXTURE);
    expect(result.candidateStrategy).toBe("bull_put_spread");
    expect(result.trend.score).toBe(SCORE_WEIGHTS.trend);
    expect(result.stochastic.score).toBe(SCORE_WEIGHTS.stochastic);
  });

  it("scores bear call trend components", () => {
    const result = computeScannerScore(BEAR_CALL_PERFECT_FIXTURE);
    expect(result.candidateStrategy).toBe("bear_call_spread");
    expect(result.trend.score).toBe(SCORE_WEIGHTS.trend);
  });

  it("scores iron condor candidate", () => {
    const result = computeScannerScore(IRON_CONDOR_PERFECT_FIXTURE);
    expect(result.candidateStrategy).toBe("iron_condor");
  });

  it("fails S/R when manual levels are missing", () => {
    const result = computeScannerScore(NO_SR_FIXTURE);
    expect(result.supportResistance.passed).toBe(false);
    expect(result.supportResistance.score).toBe(0);
    expect(result.supportResistance.reason).toContain(
      "Manual support and resistance required"
    );
  });
});
