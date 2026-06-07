import type { ScannerScoringInput } from "./types";

export const BULL_PUT_PERFECT_FIXTURE: ScannerScoringInput = {
  watchlistId: "fixture-bull",
  ticker: "BULL",
  averagePrice: 110,
  technicals: {
    atr14: 2,
    ema20: 108,
    sma50: 105,
    sma200: 100,
    sma50Previous: 104,
    stochastic: 18,
  },
  distanceEma20Pct: 1.85,
  support: 109.5,
  resistance: 120,
};

export const BEAR_CALL_PERFECT_FIXTURE: ScannerScoringInput = {
  watchlistId: "fixture-bear",
  ticker: "BEAR",
  averagePrice: 90,
  technicals: {
    atr14: 2,
    ema20: 92,
    sma50: 95,
    sma200: 100,
    sma50Previous: 96,
    stochastic: 82,
  },
  distanceEma20Pct: -2.17,
  support: 80,
  resistance: 91,
};

export const IRON_CONDOR_PERFECT_FIXTURE: ScannerScoringInput = {
  watchlistId: "fixture-ic",
  ticker: "ICND",
  averagePrice: 100,
  technicals: {
    atr14: 2,
    ema20: 100,
    sma50: 101,
    sma200: 100,
    sma50Previous: 100.5,
    stochastic: 50,
  },
  distanceEma20Pct: 0,
  support: 90,
  resistance: 110,
};

export const NO_SR_FIXTURE: ScannerScoringInput = {
  ...BULL_PUT_PERFECT_FIXTURE,
  watchlistId: "fixture-no-sr",
  ticker: "NOSR",
  support: null,
  resistance: null,
};
