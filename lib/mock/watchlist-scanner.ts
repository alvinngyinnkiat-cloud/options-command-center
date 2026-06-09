import {
  buildDefaultWatchlistSeeds,
  getAllDefaultWatchlistTickers,
  resolveWatchlistCategory,
  type WatchlistCategory,
} from "@/lib/watchlist/categories";
import {
  buildMarketDataFields,
  buildPreviousDayMarket,
  enrichScannerRow,
} from "@/lib/watchlist/calculations";
import type {
  ManualSupportResistance,
  PreviousTechnicalIndicatorFields,
  TechnicalIndicatorFields,
  WatchlistScannerRow,
} from "@/lib/watchlist/types";

interface TickerMockProfile {
  close: number;
  open: number;
  high: number;
  low: number;
  previousClose: number;
  previousDayHigh: number;
  previousDayLow: number;
  technicals: TechnicalIndicatorFields;
  previousTechnicals: PreviousTechnicalIndicatorFields;
  supportResistance?: Partial<ManualSupportResistance>;
}

function techPair(
  atr14: number,
  ema20: number,
  sma50: number,
  sma200: number,
  stochastic: number,
  prevAtr14: number,
  prevEma20: number,
  prevSma50: number,
  prevSma200: number,
  prevStochastic: number
): {
  technicals: TechnicalIndicatorFields;
  previousTechnicals: PreviousTechnicalIndicatorFields;
} {
  return {
    technicals: { atr14, ema20, sma50, sma200, stochastic },
    previousTechnicals: {
      atr14: prevAtr14,
      ema20: prevEma20,
      sma50: prevSma50,
      sma200: prevSma200,
      stochastic: prevStochastic,
    },
  };
}

const MOCK_PROFILES: Record<string, TickerMockProfile> = {
  XSP: {
    close: 738.67,
    open: 736.2,
    high: 740.1,
    low: 735.5,
    previousClose: 735.2,
    previousDayHigh: 737.8,
    previousDayLow: 733.4,
    ...techPair(8.42, 732.5, 718.2, 685.6, 52, 8.28, 731.4, 716.5, 684.8, 48.5),
    supportResistance: {
      support1: 700,
      support2: 730,
      resistance1: 790,
      resistance2: 765,
    },
  },
  SPY: {
    close: 521.4, open: 519.2, high: 522.8, low: 518.1, previousClose: 518.6,
    previousDayHigh: 519.5, previousDayLow: 516.8,
    ...techPair(5.42, 516.8, 508.2, 485.6, 58.1, 5.28, 515.4, 506.5, 484.8, 55.2),
    supportResistance: { support1: 505, resistance1: 535 },
  },
  QQQ: {
    close: 442.15, open: 440.8, high: 443.6, low: 439.5, previousClose: 440.2,
    previousDayHigh: 441.2, previousDayLow: 438.6,
    ...techPair(6.18, 438.4, 432.1, 410.5, 55.3, 6.05, 437.2, 430.8, 409.6, 52.8),
    supportResistance: { support1: 428, resistance1: 455 },
  },
  IWM: {
    close: 198.32, open: 197.5, high: 199.1, low: 196.8, previousClose: 197.1,
    previousDayHigh: 197.8, previousDayLow: 196.2,
    ...techPair(2.84, 196.2, 193.4, 188.7, 51.7, 2.78, 195.6, 192.8, 188.2, 49.4),
    supportResistance: { support1: 191, resistance1: 205 },
  },
  AVGO: {
    close: 168.45, open: 166.2, high: 169.8, low: 165.9, previousClose: 165.8,
    previousDayHigh: 166.5, previousDayLow: 164.8,
    ...techPair(4.62, 164.1, 158.3, 142.6, 64.2, 4.48, 163.2, 157.2, 141.8, 61.5),
    supportResistance: { support1: 155, resistance1: 175 },
  },
  AMZN: {
    close: 188.92, open: 187.1, high: 190.2, low: 186.4, previousClose: 186.8,
    previousDayHigh: 187.5, previousDayLow: 185.9,
    ...techPair(3.88, 185.6, 180.2, 168.4, 59.8, 3.82, 184.8, 179.1, 167.6, 57.2),
    supportResistance: { support1: 178, resistance1: 198 },
  },
  META: {
    close: 512.3, open: 508.4, high: 514.6, low: 507.2, previousClose: 507.8,
    previousDayHigh: 509.2, previousDayLow: 505.8,
    ...techPair(11.2, 502.1, 488.6, 452.3, 61.5, 10.9, 500.4, 486.8, 451.2, 58.8),
    supportResistance: { support1: 485, resistance1: 530 },
  },
  GOOGL: {
    close: 174.28, open: 173.1, high: 175.4, low: 172.6, previousClose: 172.9,
    previousDayHigh: 173.5, previousDayLow: 172.1,
    ...techPair(3.42, 171.8, 168.4, 158.2, 57.4, 3.38, 171.2, 167.5, 157.6, 55.1),
    supportResistance: { support1: 166, resistance1: 182 },
  },
  JPM: {
    close: 198.65, open: 197.2, high: 199.4, low: 196.8, previousClose: 196.9,
    previousDayHigh: 197.5, previousDayLow: 196.1,
    ...techPair(3.12, 195.8, 192.1, 182.4, 60.2, 3.05, 195.2, 191.2, 182.0, 58.4),
    supportResistance: { support1: 190, resistance1: 205 },
  },
  XOM: {
    close: 108.42, open: 107.5, high: 109.1, low: 107.1, previousClose: 107.2,
    previousDayHigh: 107.8, previousDayLow: 106.6,
    ...techPair(2.18, 106.4, 104.8, 102.1, 54.6, 2.14, 106.0, 104.2, 101.8, 52.8),
    supportResistance: { support1: 103, resistance1: 112 },
  },
  WMT: {
    close: 68.24, open: 67.9, high: 68.6, low: 67.6, previousClose: 67.8,
    previousDayHigh: 68.1, previousDayLow: 67.4,
    ...techPair(1.12, 67.2, 66.4, 64.8, 56.1, 1.1, 67.0, 66.1, 64.6, 54.8),
    supportResistance: { support1: 65.5, resistance1: 70 },
  },
  ISRG: {
    close: 412.8, open: 408.2, high: 415.6, low: 407.1, previousClose: 407.5,
    previousDayHigh: 409.0, previousDayLow: 405.8,
    ...techPair(9.84, 402.6, 392.4, 368.2, 63.8, 9.62, 401.2, 390.5, 367.4, 61.2),
    supportResistance: { support1: 388, resistance1: 425 },
  },
  ACN: {
    close: 328.15, open: 326.4, high: 329.8, low: 325.2, previousClose: 325.8,
    previousDayHigh: 326.8, previousDayLow: 324.5,
    ...techPair(5.62, 322.4, 316.8, 302.1, 52.9, 5.48, 321.6, 315.9, 301.4, 50.6),
    supportResistance: { support1: 314, resistance1: 340 },
  },
  "BRK.B": {
    close: 432.6, open: 430.8, high: 434.2, low: 429.5, previousClose: 430.1,
    previousDayHigh: 431.2, previousDayLow: 428.8,
    ...techPair(6.42, 426.8, 418.2, 398.4, 58.7, 6.28, 425.6, 416.8, 397.6, 56.4),
    supportResistance: { support1: 415, resistance1: 445 },
  },
  TMUS: {
    close: 178.42, open: 177.1, high: 179.6, low: 176.4, previousClose: 176.8,
    previousDayHigh: 177.5, previousDayLow: 176.0,
    ...techPair(3.28, 175.6, 172.4, 165.2, 55.1, 3.22, 175.0, 171.6, 164.8, 53.2),
    supportResistance: { support1: 170, resistance1: 186 },
  },
  GLD: {
    close: 218.4, open: 217.2, high: 219.1, low: 216.8, previousClose: 216.9,
    previousDayHigh: 217.5, previousDayLow: 216.2,
    ...techPair(2.42, 215.8, 212.4, 205.6, 54.2, 2.38, 215.2, 211.8, 205.0, 52.6),
    supportResistance: { support1: 210, resistance1: 225 },
  },
  CAT: {
    close: 348.2, open: 345.8, high: 350.1, low: 344.6, previousClose: 345.1,
    previousDayHigh: 346.2, previousDayLow: 343.8,
    ...techPair(6.82, 342.4, 334.8, 318.2, 57.8, 6.68, 341.2, 333.6, 317.4, 55.4),
    supportResistance: { support1: 330, resistance1: 360 },
  },
  UNH: {
    close: 548.6, open: 545.2, high: 551.4, low: 543.8, previousClose: 544.1,
    previousDayHigh: 545.8, previousDayLow: 542.4,
    ...techPair(8.42, 540.2, 528.6, 498.4, 52.4, 8.28, 539.0, 527.2, 497.6, 50.2),
    supportResistance: { support1: 520, resistance1: 570 },
  },
  HD: {
    close: 382.4, open: 380.2, high: 384.6, low: 379.1, previousClose: 379.8,
    previousDayHigh: 380.8, previousDayLow: 378.4,
    ...techPair(5.12, 378.2, 372.4, 358.6, 56.8, 5.02, 377.4, 371.6, 357.8, 54.6),
    supportResistance: { support1: 368, resistance1: 395 },
  },
  MSFT: {
    close: 428.2, open: 426.4, high: 430.1, low: 425.2, previousClose: 425.8,
    previousDayHigh: 426.8, previousDayLow: 424.6,
    ...techPair(6.28, 422.4, 414.8, 392.6, 58.4, 6.18, 421.6, 413.8, 391.8, 56.2),
    supportResistance: { support1: 410, resistance1: 440 },
  },
  AAPL: {
    close: 221.5, open: 220.2, high: 222.8, low: 219.4, previousClose: 219.8,
    previousDayHigh: 220.6, previousDayLow: 218.9,
    ...techPair(3.82, 218.4, 214.2, 202.6, 59.2, 3.74, 217.8, 213.4, 202.0, 57.0),
    supportResistance: { support1: 210, resistance1: 230 },
  },
  NVDA: {
    close: 121.8, open: 120.4, high: 123.2, low: 119.8, previousClose: 119.6,
    previousDayHigh: 120.2, previousDayLow: 118.9,
    ...techPair(4.12, 118.2, 112.4, 98.6, 62.4, 4.02, 117.4, 111.6, 98.0, 60.2),
    supportResistance: { support1: 108, resistance1: 128 },
  },
};

function defaultSupportResistance(
  watchlistId: string,
  ticker: string
): ManualSupportResistance {
  return {
    id: null,
    watchlistId,
    support1: null,
    support2: null,
    resistance1: null,
    resistance2: null,
    notes: null,
    updateDate: "2026-06-06",
    timeframe: "daily",
  };
}

const DEFAULT_TECH = techPair(2, 98, 96, 90, 50, 1.95, 97.2, 95.2, 89.2, 48.5);

export function buildMockScannerRow(
  ticker: string,
  sortOrder: number,
  watchlistId?: string,
  category?: WatchlistCategory,
  priorityRank?: number,
  notes: string | null = null
): WatchlistScannerRow {
  const id = watchlistId ?? `mock-${ticker}`;
  const profile = MOCK_PROFILES[ticker] ?? {
    close: 100,
    open: 99,
    high: 101,
    low: 98.5,
    previousClose: 99.2,
    previousDayHigh: 100.2,
    previousDayLow: 98.8,
    ...DEFAULT_TECH,
  };

  const market = buildMarketDataFields(
    profile.open,
    profile.high,
    profile.low,
    profile.close,
    profile.previousClose
  );

  const previousMarket = buildPreviousDayMarket(
    profile.previousDayHigh,
    profile.previousDayLow
  );

  const sr: ManualSupportResistance = {
    ...defaultSupportResistance(id, ticker),
    ...profile.supportResistance,
  };

  return {
    ...enrichScannerRow(
      id,
      ticker,
      sortOrder,
      market,
      previousMarket,
      profile.technicals,
      profile.previousTechnicals,
      sr,
      category,
      null,
      priorityRank ?? sortOrder,
      notes
    ),
    category: category ?? resolveWatchlistCategory(ticker),
  };
}

export function buildDefaultCategoryScannerRows(): WatchlistScannerRow[] {
  return buildDefaultWatchlistSeeds().map((seed) =>
    buildMockScannerRow(
      seed.ticker,
      seed.sortOrder,
      undefined,
      seed.category,
      seed.priorityRank
    )
  );
}

export function buildMockScannerRows(
  tickers: string[] = [...getAllDefaultWatchlistTickers()],
  category?: WatchlistCategory
): WatchlistScannerRow[] {
  return tickers.map((ticker, index) =>
    buildMockScannerRow(
      ticker,
      index,
      undefined,
      category ?? resolveWatchlistCategory(ticker)
    )
  );
}

export interface TechnicalSnapshot {
  today: TechnicalIndicatorFields;
  previous: PreviousTechnicalIndicatorFields;
}

export function getMockTechnicalSnapshot(ticker: string): TechnicalSnapshot {
  const profile = MOCK_PROFILES[ticker];
  if (profile) {
    return {
      today: profile.technicals,
      previous: profile.previousTechnicals,
    };
  }
  return {
    today: DEFAULT_TECH.technicals,
    previous: DEFAULT_TECH.previousTechnicals,
  };
}

/** @deprecated Use getMockTechnicalSnapshot */
export function getMockTechnicals(ticker: string): TechnicalIndicatorFields {
  return getMockTechnicalSnapshot(ticker).today;
}
