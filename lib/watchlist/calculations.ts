import { buildAveragePricePosition } from "./average-price-position";
import { calculateAveragePrice, buildAveragePriceComparison } from "./average-price";
import {
  resolveWatchlistCategory,
  type WatchlistCategory,
} from "./categories";
import { buildTechnicalComparisons } from "./technical-comparison";
import type {
  CalculatedDistanceFields,
  MarketDataFields,
  PreviousDayMarketFields,
  PreviousTechnicalIndicatorFields,
  TechnicalIndicatorFields,
  WatchlistScannerRow,
} from "./types";

export function calculateDailyChangePct(
  currentPrice: number,
  previousClose: number
): number {
  if (previousClose <= 0) return 0;
  return ((currentPrice - previousClose) / previousClose) * 100;
}

export function calculateDistanceFromMa(
  price: number,
  movingAverage: number
): number {
  if (movingAverage <= 0) return 0;
  return ((price - movingAverage) / movingAverage) * 100;
}

/** Distance % from Average Price — primary input for scoring and recommendations. */
export function buildDistanceFields(
  averagePrice: number,
  technicals: TechnicalIndicatorFields
): CalculatedDistanceFields {
  return {
    distanceEma20Pct: calculateDistanceFromMa(averagePrice, technicals.ema20),
    distanceSma50Pct: calculateDistanceFromMa(averagePrice, technicals.sma50),
    distanceSma200Pct: calculateDistanceFromMa(averagePrice, technicals.sma200),
  };
}

export function buildPreviousDayMarket(
  previousHigh: number,
  previousLow: number
): PreviousDayMarketFields {
  return {
    high: previousHigh,
    low: previousLow,
    averagePrice: calculateAveragePrice(previousHigh, previousLow),
  };
}

export function buildMarketDataFields(
  open: number,
  high: number,
  low: number,
  close: number,
  previousClose: number,
  currentPrice?: number
): MarketDataFields {
  const price = currentPrice ?? close;
  return {
    currentPrice: price,
    open,
    high,
    low,
    averagePrice: calculateAveragePrice(high, low),
    close,
    previousClose,
    dailyChangePct: calculateDailyChangePct(price, previousClose),
  };
}

export function enrichScannerRow(
  watchlistId: string,
  ticker: string,
  sortOrder: number,
  market: MarketDataFields,
  previousMarket: PreviousDayMarketFields,
  technicals: TechnicalIndicatorFields,
  previousTechnicals: PreviousTechnicalIndicatorFields,
  supportResistance: WatchlistScannerRow["supportResistance"],
  category?: WatchlistCategory
): WatchlistScannerRow {
  return {
    watchlistId,
    ticker,
    category: category ?? resolveWatchlistCategory(ticker),
    sortOrder,
    market,
    previousMarket,
    averagePriceComparison: buildAveragePriceComparison(
      market.high,
      market.low,
      previousMarket.high,
      previousMarket.low
    ),
    technicals,
    previousTechnicals,
    technicalComparisons: buildTechnicalComparisons(
      technicals,
      previousTechnicals
    ),
    distances: buildDistanceFields(market.averagePrice, technicals),
    averagePricePosition: buildAveragePricePosition(
      market.averagePrice,
      supportResistance.support1,
      supportResistance.resistance1
    ),
    supportResistance,
  };
}

/** Recompute distance and avg-position fields from market data + manual S/R. */
export function refreshRowDerivedFields(
  row: WatchlistScannerRow
): WatchlistScannerRow {
  return {
    ...row,
    distances: buildDistanceFields(row.market.averagePrice, row.technicals),
    averagePricePosition: buildAveragePricePosition(
      row.market.averagePrice,
      row.supportResistance.support1,
      row.supportResistance.resistance1
    ),
  };
}

export function sortScannerRows(rows: WatchlistScannerRow[]): WatchlistScannerRow[] {
  return [...rows].sort((a, b) => a.sortOrder - b.sortOrder || a.ticker.localeCompare(b.ticker));
}

export function normalizeTicker(ticker: string): string {
  return ticker.trim().toUpperCase();
}

export function isValidTicker(ticker: string): boolean {
  return /^[A-Z][A-Z0-9.\-]{0,9}$/.test(ticker);
}
