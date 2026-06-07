import type { DataSource } from "@/lib/portfolio/types";
import type { HealthScoreResult } from "@/lib/portfolio/types";
import type { EnrichedTrade } from "@/lib/trades/types";
import type { CapitalLiquidityBase } from "./capital-liquidity";
import type { SingleLegRiskChecks } from "./single-leg-checks";
import type { RiskZone } from "./constants";

export interface RiskSettingsSnapshot {
  takeProfitPercent: number;
  maxOptionsAllocationPercent: number;
  maxRiskPerTradePercent: number;
}

export interface OpenRiskByTickerRow {
  tradeId: string;
  ticker: string;
  strategy: string;
  contracts: number;
  maxRisk: number;
  /** Gross trade P/L */
  currentPnl: number;
  /** My personal share */
  myCurrentPnl: number;
  riskPct: number;
}

export interface OpenRiskByStrategyRow {
  strategy: string;
  strategyKey: string;
  openTrades: number;
  totalMaxRisk: number;
  totalCurrentPnl: number;
  riskPct: number;
}

export interface LargestRiskPosition {
  tradeId: string;
  ticker: string;
  strategy: string;
  maxRisk: number;
  riskPct: number;
  currentPnl: number;
}

export interface RiskAlert {
  code: string;
  severity: "warning" | "danger" | "info";
  title: string;
  message: string;
  ticker?: string;
}

export interface TickerExposureRow {
  tradeId: string;
  ticker: string;
  strategy: string;
  maxRisk: number;
  currentPnl: number;
  riskPct: number;
  isDuplicate: boolean;
  isConcentrated: boolean;
  isLargest: boolean;
  statusLabel: string;
}

export interface RiskDashboardSummary {
  portfolioValue: number;
  currentOpenRisk: number;
  myOpenRisk: number;
  clientOpenRisk: number;
  myOpenPnl: number;
  availableRiskCapacity: number;
  optionsAllocationPct: number;
  largestPositionRisk: number;
  portfolioHealthScore: number;
  totalOpenTrades: number;
  totalBuyingPowerUsed: number;
  maximumOptionsCapital: number;
  maximumRiskPerTrade: number;
  riskUtilizationPct: number;
  riskZone: RiskZone;
}

export interface RiskDashboardData {
  summary: RiskDashboardSummary;
  healthScore: HealthScoreResult;
  settings: RiskSettingsSnapshot;
  capitalLiquidity: CapitalLiquidityBase;
  openRiskByTicker: OpenRiskByTickerRow[];
  openRiskByStrategy: OpenRiskByStrategyRow[];
  largestRiskPositions: LargestRiskPosition[];
  tickerExposure: TickerExposureRow[];
  alerts: RiskAlert[];
  singleLegChecks: SingleLegRiskChecks;
  openTrades: EnrichedTrade[];
  dataSource: DataSource;
}
