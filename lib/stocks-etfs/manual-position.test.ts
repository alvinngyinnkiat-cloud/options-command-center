import { describe, expect, it } from "vitest";
import { calculateManualPositionMetrics } from "./manual-position";

describe("calculateManualPositionMetrics", () => {
  it("computes asset P/L, ROI, and P/L including dividend and fees", () => {
    const result = calculateManualPositionMetrics({
      currentValue: 12_000,
      capitalInvested: 10_000,
      totalDividend: 500,
      totalFees: 100,
    });

    expect(result.assetPl).toBe(2_000);
    expect(result.roiPct).toBe(20);
    expect(result.plIncludingDividend).toBe(2_400);
  });
});
