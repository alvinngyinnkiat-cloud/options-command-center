import { describe, expect, it } from "vitest";
import {
  classifySoDirection,
  classifyStochasticMomentum,
  evaluateEmaSoTurningDown,
  evaluateEmaSoTurningUp,
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

describe("classifySoDirection", () => {
  it("detects rising, falling, and flat SO", () => {
    expect(classifySoDirection(22, 18)).toBe("Rising");
    expect(classifySoDirection(3.6, 19.8)).toBe("Falling");
    expect(classifySoDirection(50, 50)).toBe("Flat");
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

  it("20 EMA put requires rising SO from oversold zone", () => {
    expect(isEmaPutStochasticConfirmed(22, 18)).toBe(true);
    expect(isEmaPutStochasticConfirmed(22, 21)).toBe(true);
    expect(isEmaPutStochasticConfirmed(30, 28)).toBe(false);
    expect(isEmaPutStochasticConfirmed(3.6, 19.8)).toBe(false);
  });

  it("20 EMA call requires falling SO from overbought zone", () => {
    expect(isEmaCallStochasticConfirmed(69, 82)).toBe(true);
    expect(isEmaCallStochasticConfirmed(80, 85)).toBe(true);
    expect(isEmaCallStochasticConfirmed(70, 68)).toBe(false);
  });

  it("INTU — falling SO fails turning up", () => {
    expect(evaluateEmaSoTurningUp(3.6, 19.8)).toBe("FAIL");
    expect(classifySoDirection(3.6, 19.8)).toBe("Falling");
  });

  it("SO below 25 alone does not approve Sell Put", () => {
    expect(isEmaPutStochasticConfirmed(3.6, 19.8)).toBe(false);
    expect(isEmaPutStochasticConfirmed(20, 22)).toBe(false);
  });

  it("SO above 75 alone does not approve Sell Call", () => {
    expect(isEmaCallStochasticConfirmed(80, 78)).toBe(false);
  });
});

describe("mainSystemMomentumScore", () => {
  it("awards 20 for rolling momentum only", () => {
    expect(mainSystemMomentumScore("Sell Put", "ROLLING UP")).toBe(20);
    expect(mainSystemMomentumScore("Sell Put", "STRONG")).toBe(0);
  });
});
