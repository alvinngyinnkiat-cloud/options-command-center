import { describe, expect, it } from "vitest";
import {
  classifyStochasticMomentum,
  isCallMomentumConfirmed,
  isEmaCallStochasticConfirmed,
  isEmaPutStochasticConfirmed,
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
  it("main put requires ROLLING UP only", () => {
    expect(isPutMomentumConfirmed("ROLLING UP")).toBe(true);
    expect(isPutMomentumConfirmed("STRONG")).toBe(false);
  });

  it("main call requires ROLLING DOWN only", () => {
    expect(isCallMomentumConfirmed("ROLLING DOWN")).toBe(true);
    expect(isCallMomentumConfirmed("STRONG")).toBe(false);
  });

  it("20 EMA put accepts ROLLING UP or SO below 25", () => {
    expect(isEmaPutStochasticConfirmed("ROLLING UP", 40)).toBe(true);
    expect(isEmaPutStochasticConfirmed("STRONG", 22)).toBe(true);
    expect(isEmaPutStochasticConfirmed("STRONG", 30)).toBe(false);
  });

  it("20 EMA call accepts ROLLING DOWN or SO above 75", () => {
    expect(isEmaCallStochasticConfirmed("ROLLING DOWN", 50)).toBe(true);
    expect(isEmaCallStochasticConfirmed("STRONG", 80)).toBe(true);
    expect(isEmaCallStochasticConfirmed("STRONG", 70)).toBe(false);
  });
});

describe("mainSystemMomentumScore", () => {
  it("awards 20 for rolling momentum only", () => {
    expect(mainSystemMomentumScore("Sell Put", "ROLLING UP")).toBe(20);
    expect(mainSystemMomentumScore("Sell Put", "STRONG")).toBe(0);
  });
});
