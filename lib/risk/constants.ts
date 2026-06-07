import { TRADING_RULES } from "@/lib/constants/trading-rules";

export const RISK_TAKE_PROFIT_PCT = TRADING_RULES.takeProfitPercent;
export const RISK_MAX_OPTIONS_ALLOCATION_PCT =
  TRADING_RULES.maxOptionsAllocationPercent;
export const RISK_MAX_RISK_PER_TRADE_PCT = TRADING_RULES.maxRiskPerTradePercent;

export const RISK_UTILIZATION_SAFE_MAX = 60;
export const RISK_UTILIZATION_CAUTION_MAX = 75;

export const RISK_DTE_ALERT_THRESHOLD = 7;

/** Position risk % of max options capital — flags concentration */
export const RISK_CONCENTRATION_THRESHOLD_PCT = 15;

export const RISK_TOP_LARGEST_COUNT = 3;

export type RiskZone = "safe" | "caution" | "danger";
