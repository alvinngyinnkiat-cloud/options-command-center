import type { DataSource } from "@/lib/portfolio/types";
import type { CapitalLiquidityResult } from "@/lib/risk/capital-liquidity";
import type { EnrichedTrade } from "@/lib/trades/types";

export type TradeQueueStatus =
  | "Ready"
  | "Waiting"
  | "Near Support"
  | "Near Resistance"
  | "No Trade"
  | "Risk Failed"
  | "Liquidity Failed";

export type MarketConditionType =
  | "Bullish"
  | "Bearish"
  | "Neutral"
  | "Transition";

export type ReadinessLabel =
  | "Ready To Trade"
  | "Strong But Review"
  | "Watch"
  | "Do Not Trade";

export type FinalRecommendation =
  | "Ready To Trade"
  | "Wait"
  | "Do Not Trade"
  | "Review Risk First"
  | "Review Liquidity First"
  | "Update Support/Resistance First";

export interface TradeQueueItem {
  priorityRank: number;
  ticker: string;
  strategy: string;
  scannerScore: number;
  combinedScore: number;
  action: string;
  status: TradeQueueStatus;
  reason: string;
  warning: string | null;
  lastUpdated: string;
}

export interface MarketConditionResult {
  condition: MarketConditionType;
  preferredStrategy: string;
  confidencePct: number;
  reason: string;
  warning: string | null;
  benchmarkScores: { ticker: string; trendPassed: boolean; stochastic: number }[];
}

export interface ActiveTickerExposureRow {
  ticker: string;
  hasActiveTrade: boolean;
  strategy: string | null;
  expiry: string | null;
  maxRisk: number | null;
  currentPnl: number | null;
  status: string | null;
  tradeId: string | null;
}

export interface ActiveTradeConflict {
  ticker: string;
  strategy: string;
  expiryDate: string;
  maxRisk: number;
  currentPnl: number;
  status: string;
}

export interface ExpectedReturnEstimate {
  label: "Conservative" | "Base" | "Aggressive";
  monthlyProfit: number;
  annualizedIncome: number;
}

export interface ExpectedReturnDashboard {
  openTradesCount: number;
  totalPremiumCollected: number;
  profitTarget75Pct: number;
  currentRealizedProfit: number;
  currentUnrealizedPnl: number;
  expectedMonthlyPremium: number;
  expectedMonthlyProfit: number;
  expectedAnnualizedIncome: number;
  estimates: ExpectedReturnEstimate[];
  disclaimer: string;
}

export interface ReadinessCheckItem {
  id: string;
  label: string;
  passed: boolean;
  detail: string;
}

export interface TradeReadinessResult {
  ticker: string;
  score: number;
  label: ReadinessLabel;
  checks: ReadinessCheckItem[];
  finalRecommendation: FinalRecommendation;
}

export interface TradingWorkflowData {
  tradeQueue: TradeQueueItem[];
  marketCondition: MarketConditionResult;
  activeTickerExposure: ActiveTickerExposureRow[];
  expectedReturn: ExpectedReturnDashboard;
  topReadiness: TradeReadinessResult[];
  liquidityCheck: CapitalLiquidityResult;
  openTrades: EnrichedTrade[];
  dataSource: DataSource;
}

export interface TradeQueuePageData extends TradingWorkflowData {
  allReadiness: TradeReadinessResult[];
}
