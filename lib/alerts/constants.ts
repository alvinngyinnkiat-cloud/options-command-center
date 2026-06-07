import { TRADING_RULES } from "@/lib/constants/trading-rules";

export const ALERT_SCORE_THRESHOLD = 80;
export const ALERT_DTE_THRESHOLD = 7;
export const ALERT_TAKE_PROFIT_PCT = TRADING_RULES.takeProfitPercent;
export const ALERT_MAX_OPTIONS_ALLOCATION_PCT =
  TRADING_RULES.maxOptionsAllocationPercent;

/** Average price within this % of a level triggers proximity alert */
export const ALERT_BREAKEVEN_PROXIMITY_PCT = 1.5;

/** Average price within ATR × multiplier of manual S/R */
export const ALERT_SR_ATR_MULTIPLIER = 1;

/** Available capacity below this % of max options capital */
export const ALERT_LOW_CAPACITY_PCT = 25;
