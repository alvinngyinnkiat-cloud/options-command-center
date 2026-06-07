import type { StrategyType } from "@/types/database";
import type { EnrichedTrade } from "@/lib/trades/types";

export type PositionCategory = "long_term" | "income";

export interface TickerTradeRow {
  trade: EnrichedTrade;
  displayStrategy: string;
  category: PositionCategory;
  myPnl: number;
  myRealizedPnl: number;
  myUnrealizedPnl: number;
  premiumCollected: number;
  capitalDeployed: number;
  currentValue: number;
  isOpen: boolean;
  parentTradeId: string | null;
}

export interface LeapsPositionDetail {
  parentTrade: EnrichedTrade;
  childTrades: EnrichedTrade[];
  originalCost: number;
  premiumFromChildren: number;
  adjustedCostBasis: number;
  longPositionPnl: number;
}

export interface TickerSharePosition {
  ticker: string;
  sharesHeld: number;
  costBasis: number;
  currentValue: number;
  unrealizedPnl: number;
}

export interface TickerPositionSummary {
  ticker: string;
  longTermStrategies: string[];
  incomeStrategies: string[];
  longTermTrades: TickerTradeRow[];
  incomeTrades: TickerTradeRow[];
  sharePosition: TickerSharePosition | null;
  leapsPositions: LeapsPositionDetail[];
  totalCapitalDeployed: number;
  currentPositionValue: number;
  totalPremiumCollected: number;
  realizedPnl: number;
  unrealizedPnl: number;
  totalPnl: number;
  longPositionPnl: number;
  incomeTradePnl: number;
  incomeCollected: number;
  adjustedCostBasis: number | null;
  roiPct: number;
  openTradesCount: number;
  closedTradesCount: number;
}

export interface TickerPerformanceReport {
  topPerformers: TickerPositionSummary[];
  worstPerformers: TickerPositionSummary[];
  incomeByTicker: { ticker: string; incomePnl: number; premiumCollected: number }[];
  premiumByTicker: { ticker: string; premiumCollected: number }[];
  summaries: TickerPositionSummary[];
}
