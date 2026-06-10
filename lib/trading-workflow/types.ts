import type { DataSource } from "@/lib/portfolio/types";
import type { CapitalLiquidityResult } from "@/lib/risk/capital-liquidity";
import type { EnrichedTrade } from "@/lib/trades/types";

export interface TradeQueueItem {
  priorityRank: number;
  ticker: string;
  category: string;
  mainDecision: string;
  strategyFitScore: number;
  emaDecision: string;
  emaScore: number;
  confluenceStatus: string;
  reason: string;
  lastUpdated: string;
}

export type MarketConditionType =
  | "Bullish"
  | "Bearish"
  | "Neutral"
  | "Transition";

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

export interface TradingWorkflowData {
  tradeQueue: TradeQueueItem[];
  marketCondition: MarketConditionResult;
  activeTickerExposure: ActiveTickerExposureRow[];
  expectedReturn: ExpectedReturnDashboard;
  liquidityCheck: CapitalLiquidityResult;
  openTrades: EnrichedTrade[];
  dataSource: DataSource;
}

export type TradeQueuePageData = TradingWorkflowData;
