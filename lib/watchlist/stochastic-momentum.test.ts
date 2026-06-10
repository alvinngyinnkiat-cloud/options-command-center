import { describe, expect, it } from "vitest";
import {
  classifyStochasticMomentum,
  isCallMomentumConfirmed,
  isPutMomentumConfirmed,
  mainSystemMomentumScore,
} from "./stochastic-momentum";

describe("classifyStochasticMomentum V3", () => {
  it("ROLLING UP when prev < 25 and current > previous", () => {
    expect(classifyStochasticMomentum(20, 18)).toBe("ROLLING UP");
  });

  it("ROLLING DOWN when prev > 75 and current < previous", () => {
    expect(classifyStochasticMomentum(69, 82)).toBe("ROLLING DOWN");
  });

  it("STRONG otherwise", () => {
    expect(classifyStochasticMomentum(48.5, 31.1)).toBe("STRONG");
  });
});

describe("momentum confirmation", () => {
  it("put accepts ROLLING UP or STRONG", () => {
    expect(isPutMomentumConfirmed("ROLLING UP")).toBe(true);
    expect(isPutMomentumConfirmed("STRONG")).toBe(true);
    expect(isPutMomentumConfirmed("ROLLING DOWN")).toBe(false);
  });

  it("call accepts ROLLING DOWN or STRONG", () => {
    expect(isCallMomentumConfirmed("ROLLING DOWN")).toBe(true);
    expect(isCallMomentumConfirmed("STRONG")).toBe(true);
  });
});

describe("mainSystemMomentumScore", () => {
  it("awards 20 for rolling momentum only", () => {
    expect(mainSystemMomentumScore("Sell Put", "ROLLING UP")).toBe(20);
    expect(mainSystemMomentumScore("Sell Put", "STRONG")).toBe(0);
  });
});
