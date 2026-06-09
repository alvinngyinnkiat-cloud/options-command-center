import { describe, expect, it } from "vitest";
import {
  calculateCurrentCloseCost,
  evaluateProfitStopStatus,
  resolveEffectiveOptionValue,
  resolveManualOptionValue,
} from "./valuation";

describe("trade valuation", () => {
  it("calculates close cost from per-contract value", () => {
    expect(calculateCurrentCloseCost(1.1, 2)).toBeCloseTo(220, 2);
  });

  it("uses manual value only — no system fallback", () => {
    expect(resolveManualOptionValue(1.5)).toBe(1.5);
    expect(resolveManualOptionValue(null)).toBeNull();
    expect(resolveEffectiveOptionValue(1.5, 1.1)).toBe(1.5);
    expect(resolveEffectiveOptionValue(null, 1.1)).toBe(0);
  });

  it("evaluates profit and stop status", () => {
    const reached = evaluateProfitStopStatus({
      currentPnl: 420,
      currentCloseCost: 220,
      profitTargetAmount: 480,
      stopLossAmount: 1120,
    });
    expect(reached.takeProfitReached).toBe(false);
    expect(reached.stopLossWarning).toBe(false);

    const profit = evaluateProfitStopStatus({
      currentPnl: 500,
      currentCloseCost: 100,
      profitTargetAmount: 480,
      stopLossAmount: 1120,
    });
    expect(profit.takeProfitReached).toBe(true);

    const stop = evaluateProfitStopStatus({
      currentPnl: -200,
      currentCloseCost: 1200,
      profitTargetAmount: 480,
      stopLossAmount: 1120,
    });
    expect(stop.stopLossWarning).toBe(true);
  });
});
