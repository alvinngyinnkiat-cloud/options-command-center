import { describe, expect, it } from "vitest";
import {
  buildAdjustedSupportResistanceLevels,
  scoreBullPutAdjustedZone,
} from "./support-resistance-atr";

describe("buildAdjustedSupportResistanceLevels", () => {
  it("computes adjusted levels from support, resistance, and ATR", () => {
    const levels = buildAdjustedSupportResistanceLevels(100, 200, 10);
    expect(levels).toEqual({
      support1: 100,
      resistance1: 200,
      atr14: 10,
      adjustedSupport: 110,
      adjustedResistance: 190,
    });
  });
});

describe("scoreBullPutAdjustedZone", () => {
  const support = 100;
  const resistance = 200;
  const atr = 10;
  const maxScore = 20;

  it("scores 20/20 inside the ATR-adjusted safe zone", () => {
    const result = scoreBullPutAdjustedZone(150, support, resistance, atr, maxScore);
    expect(result.score).toBe(20);
    expect(result.passed).toBe(true);
  });

  it("scores 10/20 inside raw S/R but outside adjusted zone", () => {
    const result = scoreBullPutAdjustedZone(105, support, resistance, atr, maxScore);
    expect(result.score).toBe(10);
    expect(result.passed).toBe(true);
  });

  it("scores 0/20 below adjusted support", () => {
    const result = scoreBullPutAdjustedZone(50, support, resistance, atr, maxScore);
    expect(result.score).toBe(0);
    expect(result.passed).toBe(false);
  });

  it("scores 10/20 in the upper ATR buffer below raw resistance", () => {
    const result = scoreBullPutAdjustedZone(195, support, resistance, atr, maxScore);
    expect(result.score).toBe(10);
    expect(result.passed).toBe(true);
  });

  it("scores 0/20 at or beyond raw resistance", () => {
    const result = scoreBullPutAdjustedZone(205, support, resistance, atr, maxScore);
    expect(result.score).toBe(0);
    expect(result.passed).toBe(false);
  });
});
