import type { DataSource } from "@/lib/portfolio/types";
import type { TradeQueueItem } from "@/lib/trading-workflow/types";
import type { WatchlistScannerRow } from "@/lib/watchlist/types";
import type { EnrichedAlert } from "@/lib/alerts/types";

export interface WeekendReviewStatus {
  lastReviewDate: string | null;
  nextReviewDueDate: string;
  weekEnding: string | null;
  tickerCount: number;
  dataSource: DataSource;
  isDue: boolean;
}

export interface WeekendRankingEntry {
  rank: number;
  watchlistId: string;
  ticker: string;
  currentPrice: number;
  averagePrice: number;
  previousDayAveragePrice: number;
  averagePriceChangePct: number;
  averagePricePositionPct: number | null;
  averagePricePositionLabel: string;
  averagePricePositionZone: "support" | "mid" | "resistance" | null;
  totalScore: number;
  decisionLabel: string;
  recommendedStrategy: string;
  action: string;
  primaryReason: string;
}

export interface WeeklyMarketUpdateRecord {
  id: string;
  reviewDate: string;
  weekEnding: string;
  ticker: string;
  watchlistId: string;
  support1: number | null;
  support2: number | null;
  resistance1: number | null;
  resistance2: number | null;
  analystNotes: string | null;
  recommendedStrategy?: string | null;
  totalScore?: number | null;
  action?: string | null;
  decisionLabel?: string | null;
}

export type TickerReviewStatusLabel =
  | "Updated This Weekend"
  | "Updated Last Week"
  | "Needs Review";

export type TickerReviewStatusKey =
  | "updated_this_weekend"
  | "updated_last_week"
  | "needs_review";

export interface TickerReviewStatusRow {
  watchlistId: string;
  ticker: string;
  lastReviewDate: string;
  support1: number | null;
  support2: number | null;
  resistance1: number | null;
  resistance2: number | null;
  analystNotes: string | null;
  reviewStatus: TickerReviewStatusLabel;
  statusKey: TickerReviewStatusKey;
}

export interface WeekendReviewSummary {
  totalTickers: number;
  updatedThisWeekend: number;
  updatedLastWeek: number;
  needsReview: number;
  bullPutCandidates: number;
  bearCallCandidates: number;
  ironCondorCandidates: number;
  noTradeCount: number;
  highestScoreTicker: string | null;
  highestScore: number;
  bestOpportunityTicker: string | null;
  bestOpportunityStrategy: string | null;
  bestOpportunityAction: string | null;
}

export interface WeekendOpportunityEntry {
  watchlistId: string;
  ticker: string;
  totalScore: number;
  recommendedStrategy: string;
  action: string;
  decisionLabel: string;
  primaryReason: string;
  averagePrice: number;
}

export interface WeekendOpportunityLists {
  bullPut: WeekendOpportunityEntry[];
  bearCall: WeekendOpportunityEntry[];
  ironCondor: WeekendOpportunityEntry[];
  noTrade: WeekendOpportunityEntry[];
}

export interface WeekendMarketReviewResult {
  success: true;
  status: WeekendReviewStatus;
  rows: WatchlistScannerRow[];
  rankings: WeekendRankingEntry[];
  snapshots: WeeklyMarketUpdateRecord[];
  summary: WeekendReviewSummary;
  opportunities: WeekendOpportunityLists;
  reviewStatusRows: TickerReviewStatusRow[];
  alerts: EnrichedAlert[];
  tradeQueue: TradeQueueItem[];
  dataSource: DataSource;
}

export type WeekendMarketReviewActionResult =
  | WeekendMarketReviewResult
  | { success: false; error: string };

export interface WeekendReviewPageData {
  rows: WatchlistScannerRow[];
  status: WeekendReviewStatus;
  history: WeeklyMarketUpdateRecord[];
  summary: WeekendReviewSummary;
  opportunities: WeekendOpportunityLists;
  reviewStatusRows: TickerReviewStatusRow[];
  alerts: EnrichedAlert[];
  dataSource: DataSource;
}
