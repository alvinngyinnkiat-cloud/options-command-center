import type { DailyCandle } from "./market-data-provider";

export interface ComputedIndicators {
  ema20: number;
  sma50: number;
  sma200: number;
  atr14: number;
  stochastic: number;
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

/** 14-period stochastic %K on the latest completed bar. */
export function computeStochastic14(candles: DailyCandle[]): number | null {
  if (candles.length < 14) return null;

  const window = candles.slice(-14);
  const close = window[window.length - 1]!.close;
  const low = Math.min(...window.map((c) => c.low));
  const high = Math.max(...window.map((c) => c.high));
  if (high === low) return 50;
  return ((close - low) / (high - low)) * 100;
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
  const stochastic = computeStochastic14(candles);

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
