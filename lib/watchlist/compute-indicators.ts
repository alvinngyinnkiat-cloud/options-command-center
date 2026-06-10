import type { DailyCandle } from "./market-data-provider";

/** TradingView Stochastic settings — must stay in sync with chart defaults. */
export const STOCHASTIC_LENGTH = 10;
export const STOCHASTIC_K_SMOOTHING = 3;
export const STOCHASTIC_OVERSOLD = 20;
export const STOCHASTIC_OVERBOUGHT = 90;

export interface ComputedIndicators {
  ema20: number;
  sma50: number;
  sma200: number;
  atr14: number;
  stochastic: number;
}

export interface StochasticDebugInfo {
  ticker?: string;
  candleDate: string;
  close: number;
  /** Highest high over the lookback window (length bars). */
  rawHigh: number;
  /** Lowest low over the lookback window (length bars). */
  rawLow: number;
  /** Unsmoothed fast %K on the completed bar. */
  rawK: number;
  /** Scanner SO (fast %K, length=10). */
  soValue: number;
  /** SMA(raw %K, K Smoothing) — TradingView smoothed %K line. */
  smoothedK: number | null;
  soLength: number;
  soSmoothing: number;
  /** Daily completed candles only — never weekly or intraday. */
  timeframe: "daily";
  /** Last `soLength` bars used for the raw %K window. */
  windowBars: Array<{
    date: string;
    high: number;
    low: number;
    close: number;
  }>;
}

function closes(candles: DailyCandle[]): number[] {
  return candles.map((c) => c.close);
}

export function computeSma(values: number[], period: number): number | null {
  if (values.length < period) return null;
  const slice = values.slice(-period);
  return slice.reduce((s, v) => s + v, 0) / period;
}

export function computeEma(values: number[], period: number): number | null {
  if (values.length < period) return null;
  const k = 2 / (period + 1);
  let ema = values.slice(0, period).reduce((s, v) => s + v, 0) / period;
  for (let i = period; i < values.length; i++) {
    ema = values[i]! * k + ema * (1 - k);
  }
  return ema;
}

export function computeAtr14(candles: DailyCandle[]): number | null {
  if (candles.length < 15) return null;

  const trs: number[] = [];
  for (let i = 1; i < candles.length; i++) {
    const cur = candles[i]!;
    const prev = candles[i - 1]!;
    const tr = Math.max(
      cur.high - cur.low,
      Math.abs(cur.high - prev.close),
      Math.abs(cur.low - prev.close)
    );
    trs.push(tr);
  }

  if (trs.length < 14) return null;

  let atr = trs.slice(0, 14).reduce((s, v) => s + v, 0) / 14;
  for (let i = 14; i < trs.length; i++) {
    atr = (atr * 13 + trs[i]!) / 14;
  }
  return atr;
}

/** Raw %K for the bar at `endIndex` using `length` daily candles. */
export function computeRawStochasticK(
  candles: DailyCandle[],
  endIndex: number,
  length: number = STOCHASTIC_LENGTH
): number | null {
  if (endIndex < length - 1 || endIndex >= candles.length) return null;

  const window = candles.slice(endIndex - length + 1, endIndex + 1);
  const close = window[window.length - 1]!.close;
  const low = Math.min(...window.map((c) => c.low));
  const high = Math.max(...window.map((c) => c.high));
  if (high === low) return 50;
  return ((close - low) / (high - low)) * 100;
}

/**
 * Smoothed %K = SMA(raw %K, kSmoothing) — TradingView %K plot when K Smoothing > 1.
 * See computeStochastic() for the scanner's primary SO value.
 */
export function computeSmoothedStochasticK(
  candles: DailyCandle[],
  length: number = STOCHASTIC_LENGTH,
  kSmoothing: number = STOCHASTIC_K_SMOOTHING
): number | null {
  const minBars = length + kSmoothing - 1;
  if (candles.length < minBars) return null;

  const rawKs: number[] = [];
  for (let i = length - 1; i < candles.length; i++) {
    const k = computeRawStochasticK(candles, i, length);
    if (k != null) rawKs.push(k);
  }

  if (rawKs.length < kSmoothing) return null;

  const smoothSlice = rawKs.slice(-kSmoothing);
  return smoothSlice.reduce((s, v) => s + v, 0) / kSmoothing;
}

/**
 * Scanner SO on the latest completed daily bar.
 * Uses TradingView fast %K (ta.stoch with length=10) — matches the Stochastic
 * readout traders compare on daily charts. Smoothed %K (K Smoothing=3) is in debug.
 */
export function computeStochastic(
  candles: DailyCandle[],
  length: number = STOCHASTIC_LENGTH,
  _kSmoothing: number = STOCHASTIC_K_SMOOTHING
): number | null {
  if (candles.length < length) return null;
  return computeRawStochasticK(candles, candles.length - 1, length);
}

/** @deprecated Use computeStochastic — kept for migration reference. */
export function computeStochastic14(candles: DailyCandle[]): number | null {
  if (candles.length < 14) return null;
  const window = candles.slice(-14);
  const close = window[window.length - 1]!.close;
  const low = Math.min(...window.map((c) => c.low));
  const high = Math.max(...window.map((c) => c.high));
  if (high === low) return 50;
  return ((close - low) / (high - low)) * 100;
}

export function buildStochasticDebug(
  candles: DailyCandle[],
  ticker?: string,
  length: number = STOCHASTIC_LENGTH,
  kSmoothing: number = STOCHASTIC_K_SMOOTHING
): StochasticDebugInfo | null {
  const minBars = length + kSmoothing - 1;
  if (candles.length < minBars) return null;

  const endIndex = candles.length - 1;
  const rawK = computeRawStochasticK(candles, endIndex, length);
  const soValue = computeStochastic(candles, length, kSmoothing);
  const smoothedK = computeSmoothedStochasticK(candles, length, kSmoothing);
  if (rawK == null || soValue == null) return null;

  const window = candles.slice(endIndex - length + 1, endIndex + 1);
  const latest = window[window.length - 1]!;

  return {
    ticker,
    candleDate: latest.date,
    close: latest.close,
    rawHigh: Math.max(...window.map((c) => c.high)),
    rawLow: Math.min(...window.map((c) => c.low)),
    rawK,
    soValue,
    smoothedK,
    soLength: length,
    soSmoothing: kSmoothing,
    timeframe: "daily",
    windowBars: window.map((c) => ({
      date: c.date,
      high: c.high,
      low: c.low,
      close: c.close,
    })),
  };
}

export function computeIndicatorsFromCandles(
  candles: DailyCandle[]
): ComputedIndicators | null {
  if (candles.length < 200) return null;

  const closeSeries = closes(candles);
  const ema20 = computeEma(closeSeries, 20);
  const sma50 = computeSma(closeSeries, 50);
  const sma200 = computeSma(closeSeries, 200);
  const atr14 = computeAtr14(candles);
  const stochastic = computeStochastic(candles);

  if (
    ema20 == null ||
    sma50 == null ||
    sma200 == null ||
    atr14 == null ||
    stochastic == null
  ) {
    return null;
  }

  return { ema20, sma50, sma200, atr14, stochastic };
}

export function computePreviousSma50(candles: DailyCandle[]): number | null {
  if (candles.length < 51) return null;
  return computeSma(closes(candles.slice(0, -1)), 50);
}
