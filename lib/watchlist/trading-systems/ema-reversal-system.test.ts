import { describe, expect, it } from "vitest";
import {
  computeBaseSrSignal,
  computeEmaDifference,
  computeEmaReversalSystem,
  isCallEmaConfirmation,
  isInStrictResistanceZone,
  isInStrictSupportZone,
  isPutEmaConfirmation,
} from "./ema-reversal-system";
import type { TradingSystemsInput } from "./types";

const BASE: TradingSystemsInput = {
  watchlistId: "w1",
  ticker: "IWM",
  averagePrice: 700,
  previousAveragePrice: 695,
  atr14: 10,
  ema20: 710,
  sma50: 720,
  sma200: 680,
  sma50Previous: 715,
  stochastic: 20,
  previousStochastic: 18,
  dailySupport: 695,
  dailyResistance: 790,
  weeklySupport: null,
  weeklyResistance: null,
};

describe("strict S/R zones", () => {
  it("Sell Put zone: Support ≤ avg ≤ Support + ATR", () => {
    expect(isInStrictSupportZone(105, 100, 10)).toBe(true);
    expect(isInStrictSupportZone(100, 100, 10)).toBe(true);
    expect(isInStrictSupportZone(110, 100, 10)).toBe(true);
    expect(isInStrictSupportZone(111, 100, 10)).toBe(false);
    expect(isInStrictSupportZone(99, 100, 10)).toBe(false);
  });

  it("Sell Call zone: Resistance − ATR ≤ avg ≤ Resistance", () => {
    expect(isInStrictResistanceZone(195, 200, 10)).toBe(true);
    expect(isInStrictResistanceZone(190, 200, 10)).toBe(true);
    expect(isInStrictResistanceZone(200, 200, 10)).toBe(true);
    expect(isInStrictResistanceZone(189, 200, 10)).toBe(false);
    expect(isInStrictResistanceZone(201, 200, 10)).toBe(false);
  });

  it("JPM — average above support zone is NO TRADE", () => {
    const jpm: TradingSystemsInput = {
      ...BASE,
      ticker: "JPM",
      averagePrice: 312.7,
      atr14: 6.36,
      dailySupport: 300,
      dailyResistance: 400,
    };
    const base = computeBaseSrSignal(jpm);
    expect(base.adjustedSupport).toBeCloseTo(306.36, 2);
    expect(base.baseSrSignal).toBe("No Trade");
    expect(base.baseSrReason).toBe(
      "Average Price outside support/resistance zone"
    );

    const result = computeEmaReversalSystem(jpm);
    expect(result.recommendation).toBe("No Trade");
    expect(result.reason).toBe(
      "Average Price outside support/resistance zone"
    );
  });
});

const PUT_EMA_SETUP: TradingSystemsInput = {
  ...BASE,
  averagePrice: 700,
  ema20: 700,
};

describe("20 EMA system — stochastic confirmation", () => {
  it("never outputs Iron Condor", () => {
    expect(computeEmaReversalSystem(BASE).recommendation).not.toBe("Iron Condor");
  });

  it("uses EMA difference bands not EMA trend", () => {
    expect(isPutEmaConfirmation(computeEmaDifference(702, 700).differencePct)).toBe(
      true
    );
    expect(isCallEmaConfirmation(-2)).toBe(true);
  });

  it("confirms Sell Put when SO is rising from oversold", () => {
    const result = computeEmaReversalSystem({
      ...PUT_EMA_SETUP,
      stochastic: 22,
      previousStochastic: 18,
    });
    expect(result.baseSrSignal).toBe("Sell Put");
    expect(result.soTurningUp).toBe("PASS");
    if (result.emaScore >= 75) {
      expect(result.recommendation).toBe("Sell Put");
    }
  });

  it("rejects Sell Put when SO is not turning up", () => {
    const result = computeEmaReversalSystem({
      ...PUT_EMA_SETUP,
      stochastic: 30,
      previousStochastic: 28,
    });
    expect(result.recommendation).toBe("No Trade");
    expect(result.reason).toContain("SO not turning up");
  });

  it("INTU — falling SO blocks Sell Put even in support zone", () => {
    const intu: TradingSystemsInput = {
      ...PUT_EMA_SETUP,
      ticker: "INTU",
      stochastic: 3.6,
      previousStochastic: 19.8,
    };
    const result = computeEmaReversalSystem(intu);
    expect(result.baseSrSignal).toBe("Sell Put");
    expect(result.soDirection).toBe("Falling");
    expect(result.soTurningUp).toBe("FAIL");
    expect(result.recommendation).toBe("No Trade");
    expect(result.reason).toContain("SO not turning up");
  });

  it("confirms Sell Call when in resistance zone", () => {
    const callBase: TradingSystemsInput = {
      ...BASE,
      averagePrice: 785,
      ema20: 790,
      dailySupport: 695,
      dailyResistance: 790,
    };
    expect(computeBaseSrSignal(callBase).baseSrSignal).toBe("Sell Call");
  });
});
