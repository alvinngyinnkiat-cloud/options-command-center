import type { DataSource } from "@/lib/portfolio/types";
import type { ScannerScoreResult } from "@/lib/watchlist/scanner-result";
import type { WatchlistCategory } from "@/lib/watchlist/categories";
import type { TimeframeType } from "@/types/database";

export type Direction = "up" | "down" | "flat";

/** MANUAL INPUT ONLY — never auto-generated. See PROJECT_RULES.md */
export interface ManualSupportResistance {
  id: string | null;
  watchlistId: string;
  support1: number | null;
  support2: number | null;
  resistance1: number | null;
  resistance2: number | null;
  notes: string | null;
  updateDate: string;
  timeframe: TimeframeType;
}

export interface MarketDataFields {
  currentPrice: number;
  open: number;
  high: number;
  low: number;
  /** (High + Low) / 2 */
  averagePrice: number;
  close: number;
  previousClose: number;
  dailyChangePct: number;
}

export interface PreviousDayMarketFields {
  high: number;
  low: number;
  averagePrice: number;
}

export interface AveragePriceComparison {
  todayAverage: number;
  previousAverage: number;
  difference: number;
  differencePct: number;
  direction: Direction;
}

export interface TechnicalIndicatorFields {
  atr14: number;
  ema20: number;
  sma50: number;
  sma200: number;
  stochastic: number;
}

export interface PreviousTechnicalIndicatorFields {
  atr14: number | null;
  ema20: number | null;
  sma50: number | null;
  sma200: number | null;
  stochastic: number | null;
}

export interface IndicatorComparison {
  today: number;
  previous: number | null;
  difference: number | null;
  differencePct: number | null;
  direction: Direction | null;
  available: boolean;
}

export interface TechnicalComparisons {
  atr14: IndicatorComparison;
  ema20: IndicatorComparison;
  sma50: IndicatorComparison;
  sma200: IndicatorComparison;
  stochastic: IndicatorComparison;
}

export type AveragePricePositionZone = "support" | "mid" | "resistance";

export interface AveragePricePosition {
  /** 0 = at support, 50 = mid range, 100 = at resistance */
  positionPct: number | null;
  zone: AveragePricePositionZone | null;
  label: string;
}

export interface CalculatedDistanceFields {
  /** From Average Price — used for scoring and recommendations */
  distanceEma20Pct: number;
  distanceSma50Pct: number;
  distanceSma200Pct: number;
}

export interface WatchlistScannerRow {
  watchlistId: string;
  ticker: string;
  category: WatchlistCategory;
  sortOrder: number;
  market: MarketDataFields;
  previousMarket: PreviousDayMarketFields;
  averagePriceComparison: AveragePriceComparison;
  technicals: TechnicalIndicatorFields;
  previousTechnicals: PreviousTechnicalIndicatorFields;
  technicalComparisons: TechnicalComparisons;
  distances: CalculatedDistanceFields;
  averagePricePosition: AveragePricePosition;
  supportResistance: ManualSupportResistance;
  score?: ScannerScoreResult;
}

export interface WatchlistScannerData {
  rows: WatchlistScannerRow[];
  dataSource: DataSource;
}

export interface SupportResistanceInput {
  watchlistId: string;
  ticker: string;
  support1: number | null;
  support2: number | null;
  resistance1: number | null;
  resistance2: number | null;
  notes: string | null;
  updateDate: string;
  timeframe?: TimeframeType;
}
