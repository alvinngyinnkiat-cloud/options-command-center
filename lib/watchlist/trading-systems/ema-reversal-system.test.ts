import { describe, expect, it } from "vitest";
import {
  computeBaseSrSignal,
  computeEmaDifference,
  computeEmaReversalSystem,
  isCallEmaConfirmation,
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

describe("20 EMA system V3", () => {
  it("never outputs Iron Condor", () => {
    expect(computeEmaReversalSystem(BASE).recommendation).not.toBe("Iron Condor");
  });

  it("uses EMA difference bands not EMA trend", () => {
    expect(isPutEmaConfirmation(computeEmaDifference(702, 700).differencePct)).toBe(
      true
    );
    expect(isCallEmaConfirmation(-2)).toBe(true);
  });

  it("confirms Sell Put with STRONG momentum and EMA bands", () => {
    const putSetup: TradingSystemsInput = {
      ...BASE,
      averagePrice: 702,
      ema20: 700,
      stochastic: 30,
      previousStochastic: 28,
    };
    const result = computeEmaReversalSystem(putSetup);
    expect(result.momentumStatus).toBe("STRONG");
    expect(result.baseSrSignal).toBe("Sell Put");
  });
});
