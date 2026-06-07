import { describe, expect, it } from "vitest";
import {
  calculateBreakevenSafety,
  formatBreakevenDistanceDollars,
  formatBreakevenSafetyPct,
  getBreakevenSafetyStatus,
} from "./breakeven-safety";

describe("breakeven safety", () => {
  it("calculates bull put distance above breakeven", () => {
    const result = calculateBreakevenSafety({
      strategy: "bull_put_spread",
      premiumPerContract: 2.5,
      currentStockPrice: 552.3,
      strikes: {
        shortStrikePut: 500,
        longStrikePut: 495,
        shortStrikeCall: null,
        longStrikeCall: null,
      },
      breakevenPut: 497.5,
      breakevenCall: null,
    });
    expect(result.breakevenPrice).toBe(497.5);
    expect(result.distance).toBeCloseTo(54.8, 1);
    expect(result.distancePct).toBeCloseTo(11.02, 1);
    expect(result.status).toBe("Safe");
  });

  it("calculates bear call distance below breakeven", () => {
    const result = calculateBreakevenSafety({
      strategy: "bear_call_spread",
      premiumPerContract: 1.8,
      currentStockPrice: 515,
      strikes: {
        shortStrikePut: null,
        longStrikePut: null,
        shortStrikeCall: 520,
        longStrikeCall: 525,
      },
      breakevenPut: null,
      breakevenCall: 521.8,
    });
    expect(result.breakevenPrice).toBe(521.8);
    expect(result.distance).toBeCloseTo(6.8, 1);
    expect(result.distancePct).toBeCloseTo(1.3, 1);
    expect(result.status).toBe("Danger");
  });

  it("calculates iron condor nearest breakeven side", () => {
    const result = calculateBreakevenSafety({
      strategy: "iron_condor",
      premiumPerContract: 3,
      currentStockPrice: 500,
      strikes: {
        shortStrikePut: 490,
        longStrikePut: 485,
        shortStrikeCall: 510,
        longStrikeCall: 515,
      },
      breakevenPut: 487,
      breakevenCall: 513,
    });
    expect(result.breakevenPutPrice).toBe(487);
    expect(result.breakevenCallPrice).toBe(513);
    expect(result.nearestSide).toBe("Put Side");
    expect(result.distance).toBe(13);
    expect(result.distancePct).toBeCloseTo(2.6, 1);
    expect(result.status).toBe("Caution");
  });

  it("returns null distance without stock price", () => {
    const result = calculateBreakevenSafety({
      strategy: "bull_put_spread",
      premiumPerContract: 2,
      currentStockPrice: null,
      strikes: {
        shortStrikePut: 500,
        longStrikePut: 495,
        shortStrikeCall: null,
        longStrikeCall: null,
      },
      breakevenPut: 498,
      breakevenCall: null,
    });
    expect(result.distancePct).toBeNull();
    expect(result.status).toBeNull();
  });

  it("assigns breakeven safety status thresholds", () => {
    expect(getBreakevenSafetyStatus(6)).toBe("Safe");
    expect(getBreakevenSafetyStatus(5)).toBe("Caution");
    expect(getBreakevenSafetyStatus(2)).toBe("Caution");
    expect(getBreakevenSafetyStatus(1.9)).toBe("Danger");
    expect(getBreakevenSafetyStatus(-0.1)).toBe("Breached");
  });

  it("formats breakeven safety display", () => {
    expect(formatBreakevenSafetyPct(4.2)).toBe("+4.2%");
    expect(formatBreakevenSafetyPct(-1.5)).toBe("-1.5%");
    expect(formatBreakevenDistanceDollars(3.25)).toBe("+$3.25");
    expect(formatBreakevenDistanceDollars(-2)).toBe("-$2.00");
  });
});
