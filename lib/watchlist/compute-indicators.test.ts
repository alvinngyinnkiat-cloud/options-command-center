import { describe, expect, it } from "vitest";
import type { DailyCandle } from "./market-data-provider";
import {
  computeEma,
  computeIndicatorsFromCandles,
  computeSma,
  computeStochastic14,
} from "./compute-indicators";

function syntheticCandles(count: number, start = 100): DailyCandle[] {
  return Array.from({ length: count }, (_, i) => {
    const close = start + i * 0.5;
    return {
      date: `2024-${String(Math.floor(i / 28) + 1).padStart(2, "0")}-${String((i % 28) + 1).padStart(2, "0")}`,
      open: close - 0.2,
      high: close + 1,
      low: close - 1,
      close,
      volume: 1_000_000,
    };
  });
}

describe("compute indicators", () => {
  it("computes SMA", () => {
    expect(computeSma([1, 2, 3, 4, 5], 5)).toBe(3);
  });

  it("computes EMA", () => {
    const ema = computeEma([10, 11, 12, 13, 14], 5);
    expect(ema).not.toBeNull();
  });

  it("computes full indicator set from 200+ candles", () => {
    const candles = syntheticCandles(220, 50);
    const result = computeIndicatorsFromCandles(candles);
    expect(result).not.toBeNull();
    expect(result!.ema20).toBeGreaterThan(0);
    expect(result!.sma50).toBeGreaterThan(0);
    expect(result!.sma200).toBeGreaterThan(0);
    expect(result!.atr14).toBeGreaterThan(0);
    expect(result!.stochastic).toBeGreaterThanOrEqual(0);
    expect(result!.stochastic).toBeLessThanOrEqual(100);
  });

  it("returns null when history is insufficient", () => {
    expect(computeIndicatorsFromCandles(syntheticCandles(50))).toBeNull();
  });

  it("computes stochastic in range", () => {
    const stoch = computeStochastic14(syntheticCandles(20, 80));
    expect(stoch).not.toBeNull();
  });
});
