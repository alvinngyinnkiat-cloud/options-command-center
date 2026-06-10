import { describe, expect, it } from "vitest";
import type { DailyCandle } from "./market-data-provider";
import {
  buildStochasticDebug,
  computeEma,
  computeIndicatorsFromCandles,
  computeRawStochasticK,
  computeSmoothedStochasticK,
  computeSma,
  computeStochastic,
  computeStochastic14,
  STOCHASTIC_K_SMOOTHING,
  STOCHASTIC_LENGTH,
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
});

describe("TradingView stochastic (length=10, K smoothing=3)", () => {
  it("uses length 10 and K smoothing 3 constants", () => {
    expect(STOCHASTIC_LENGTH).toBe(10);
    expect(STOCHASTIC_K_SMOOTHING).toBe(3);
  });

  it("computes raw %K from 10-bar high/low window", () => {
    const candles: DailyCandle[] = [
      { date: "2026-01-01", open: 90, high: 92, low: 88, close: 91, volume: 1 },
      { date: "2026-01-02", open: 91, high: 93, low: 89, close: 92, volume: 1 },
      { date: "2026-01-03", open: 92, high: 94, low: 90, close: 93, volume: 1 },
      { date: "2026-01-04", open: 93, high: 95, low: 91, close: 94, volume: 1 },
      { date: "2026-01-05", open: 94, high: 96, low: 92, close: 95, volume: 1 },
      { date: "2026-01-06", open: 95, high: 97, low: 93, close: 96, volume: 1 },
      { date: "2026-01-07", open: 96, high: 98, low: 94, close: 97, volume: 1 },
      { date: "2026-01-08", open: 97, high: 99, low: 95, close: 98, volume: 1 },
      { date: "2026-01-09", open: 98, high: 100, low: 96, close: 99, volume: 1 },
      { date: "2026-01-10", open: 99, high: 100, low: 94, close: 96, volume: 1 },
    ];

    const rawK = computeRawStochasticK(candles, 9, 10);
    expect(rawK).toBeCloseTo(((96 - 88) / (100 - 88)) * 100, 5);
  });

  it("smooths raw %K with 3-period SMA for TradingView %K line", () => {
    const candles: DailyCandle[] = Array.from({ length: 15 }, (_, i) => ({
      date: `2026-01-${String(i + 1).padStart(2, "0")}`,
      open: 100,
      high: 100 + (i % 3),
      low: 90 - (i % 2),
      close: 95 + (i % 4),
      volume: 1,
    }));

    const rawKs: number[] = [];
    for (let i = STOCHASTIC_LENGTH - 1; i < candles.length; i++) {
      const k = computeRawStochasticK(candles, i, STOCHASTIC_LENGTH);
      if (k != null) rawKs.push(k);
    }
    const expected = rawKs.slice(-3).reduce((s, v) => s + v, 0) / 3;

    expect(computeSmoothedStochasticK(candles)).toBeCloseTo(expected, 5);
  });

  it("scanner SO uses fast raw %K (length 10)", () => {
    const candles = syntheticCandles(220, 80);
    const raw = computeRawStochasticK(candles, candles.length - 1, STOCHASTIC_LENGTH);
    expect(computeStochastic(candles)).toBeCloseTo(raw!, 5);
  });

  it("differs from legacy 14-period unsmoothed stochastic", () => {
    const candles = syntheticCandles(220, 80);
    const legacy = computeStochastic14(candles);
    const tv = computeStochastic(candles);
    expect(legacy).not.toBeNull();
    expect(tv).not.toBeNull();
    expect(Math.abs(legacy! - tv!)).toBeGreaterThan(0.01);
  });

  it("builds debug output with window OHLC", () => {
    const candles = syntheticCandles(220, 80);
    const debug = buildStochasticDebug(candles, "IWM");
    expect(debug).not.toBeNull();
    expect(debug!.soLength).toBe(10);
    expect(debug!.soSmoothing).toBe(3);
    expect(debug!.timeframe).toBe("daily");
    expect(debug!.windowBars).toHaveLength(10);
    expect(debug!.rawHigh).toBeGreaterThanOrEqual(debug!.rawLow);
  });
});
