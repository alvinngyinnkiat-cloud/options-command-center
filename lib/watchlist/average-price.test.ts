import { describe, expect, it } from "vitest";
import {
  buildAveragePriceComparison,
  calculateAveragePrice,
  calculateAveragePriceChangePct,
  getDirection,
} from "./average-price";

describe("calculateAveragePrice", () => {
  it("equals (High + Low) / 2", () => {
    expect(calculateAveragePrice(522.8, 518.1)).toBeCloseTo(520.45, 2);
    expect(calculateAveragePrice(100, 90)).toBe(95);
  });
});

describe("buildAveragePriceComparison", () => {
  it("computes difference and change % vs previous day", () => {
    const result = buildAveragePriceComparison(522.8, 518.1, 520, 516);
    expect(result.todayAverage).toBeCloseTo(520.45, 2);
    expect(result.previousAverage).toBe(518);
    expect(result.difference).toBeCloseTo(2.45, 2);
    expect(result.differencePct).toBeCloseTo(0.473, 2);
    expect(result.direction).toBe("up");
  });

  it("marks flat when difference is negligible", () => {
    expect(getDirection(0)).toBe("flat");
    expect(getDirection(0.00001)).toBe("flat");
  });

  it("calculates change % from previous average", () => {
    expect(calculateAveragePriceChangePct(105, 100)).toBe(5);
    expect(calculateAveragePriceChangePct(95, 100)).toBe(-5);
  });
});
