import { describe, expect, it } from "vitest";
import {
  classifyEmaTrend,
  computeBaseSrSignal,
  computeEmaReversalSystem,
  isCallEmaTrendConfirmed,
  isPutEmaTrendConfirmed,
} from "./ema-reversal-system";
import type { TradingSystemsInput } from "./types";

const BASE: TradingSystemsInput = {
  watchlistId: "w1",
  ticker: "IWM",
  averagePrice: 700,
  atr14: 10,
  ema20: 746,
  ema20Previous: 744,
  sma50: 720,
  sma200: 680,
  sma50Previous: 715,
  stochastic: 38.9,
  previousStochastic: 14.7,
  dailySupport: 695,
  dailyResistance: 790,
  weeklySupport: null,
  weeklyResistance: null,
};

describe("20 EMA system — S/R first + EMA trend confirmation", () => {
  it("never outputs Iron Condor", () => {
    const result = computeEmaReversalSystem(BASE);
    expect(result.recommendation).not.toBe("Iron Condor");
  });

  it("derives base S/R signal from support zone", () => {
    const base = computeBaseSrSignal(BASE);
    expect(base.baseSrSignal).toBe("Sell Put");
  });

  it("requires base S/R signal before EMA can confirm Sell Put", () => {
    const noSr: TradingSystemsInput = {
      ...BASE,
      dailySupport: null,
      dailyResistance: null,
    };
    const result = computeEmaReversalSystem(noSr);
    expect(result.baseSrSignal).toBe("No Trade");
    expect(result.recommendation).toBe("No Trade");
  });

  it("confirms Sell Put when EMA is rising and SO rolling up", () => {
    const result = computeEmaReversalSystem(BASE);
    expect(isPutEmaTrendConfirmed(BASE.ema20, BASE.ema20Previous)).toBe(true);
    expect(classifyEmaTrend(BASE.ema20, BASE.ema20Previous)).toBe("RISING");
    expect(result.baseSrSignal).toBe("Sell Put");
    expect(result.momentumStatus).toBe("ROLLING UP");
    if (result.emaScore >= 75) {
      expect(result.recommendation).toBe("Sell Put");
    }
  });

  it("passes Sell Put when previous EMA20=744 and current EMA20=746", () => {
    expect(isPutEmaTrendConfirmed(746, 744)).toBe(true);
    expect(classifyEmaTrend(746, 744)).toBe("RISING");
  });

  it("passes Sell Call when previous EMA20=746 and current EMA20=744", () => {
    expect(isCallEmaTrendConfirmed(744, 746)).toBe(true);
    expect(classifyEmaTrend(744, 746)).toBe("FALLING");
  });

  it("returns NO TRADE with EMA trend reason when put base but EMA not rising", () => {
    const fallingEma: TradingSystemsInput = {
      ...BASE,
      ema20: 744,
      ema20Previous: 746,
    };
    const result = computeEmaReversalSystem(fallingEma);
    expect(result.recommendation).toBe("No Trade");
    expect(result.reason).toBe("EMA trend confirmation failed");
  });

  it("returns NO TRADE with EMA trend reason when call base but EMA not falling", () => {
    const callBase: TradingSystemsInput = {
      ...BASE,
      averagePrice: 785,
      ema20: 746,
      ema20Previous: 744,
      dailySupport: 695,
      dailyResistance: 790,
    };
    const base = computeBaseSrSignal(callBase);
    expect(base.baseSrSignal).toBe("Sell Call");

    const result = computeEmaReversalSystem(callBase);
    expect(result.recommendation).toBe("No Trade");
    expect(result.reason).toBe("EMA trend confirmation failed");
  });

  it("exposes display fields on result", () => {
    const result = computeEmaReversalSystem(BASE);
    expect(result.baseSrSignal).toBeDefined();
    expect(result.emaDifference).toBeDefined();
    expect(result.emaTrend).toMatch(/RISING|FALLING|FLAT|—/);
    expect(result.momentumStatus).toMatch(/ROLLING UP|ROLLING DOWN|STRONG/);
  });
});
