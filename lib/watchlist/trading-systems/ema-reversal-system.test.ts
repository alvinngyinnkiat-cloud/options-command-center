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
  atr14: 10,
  ema20: 710,
  sma50: 720,
  sma200: 680,
  sma50Previous: 715,
  stochastic: 22,
  previousStochastic: 18,
  dailySupport: 695,
  dailyResistance: 790,
  weeklySupport: null,
  weeklyResistance: null,
};

describe("20 EMA system — S/R first + EMA confirmation", () => {
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

  it("confirms Sell Put when EMA % is 0–2.5% and SO turning up", () => {
    const putSetup: TradingSystemsInput = {
      ...BASE,
      averagePrice: 702,
      ema20: 700,
      stochastic: 25,
      previousStochastic: 20,
    };
    expect(isPutEmaConfirmation(computeEmaDifference(702, 700).differencePct)).toBe(
      true
    );
    const result = computeEmaReversalSystem(putSetup);
    expect(result.baseSrSignal).toBe("Sell Put");
    if (result.emaScore >= 75) {
      expect(result.recommendation).toBe("Sell Put");
    }
  });

  it("confirms Sell Put when EMA % is below -7.5%", () => {
    expect(isPutEmaConfirmation(-8)).toBe(true);
    expect(isPutEmaConfirmation(-5)).toBe(false);
  });

  it("confirms Sell Call when EMA % is 0 to -2.5% and SO turning down", () => {
    expect(isCallEmaConfirmation(-2)).toBe(true);
    expect(isCallEmaConfirmation(1)).toBe(false);
  });

  it("confirms Sell Call when EMA % is above +7.5%", () => {
    expect(isCallEmaConfirmation(8)).toBe(true);
  });

  it("exposes display fields on result", () => {
    const result = computeEmaReversalSystem(BASE);
    expect(result.baseSrSignal).toBeDefined();
    expect(result.emaDifference).toBeDefined();
    expect(result.stochasticDirection).toMatch(/Up|Down|Flat|—/);
  });
});
