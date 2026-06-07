import type { StrategyType } from "@/types/database";
import type { TradeTrackerStatus } from "./types";

export const TRADE_STRATEGY_OPTIONS: {
  value: StrategyType;
  label: string;
  futureOnly?: boolean;
}[] = [
  { value: "bull_put_spread", label: "Bull Put" },
  { value: "bear_call_spread", label: "Bear Call" },
  { value: "iron_condor", label: "Iron Condor" },
  { value: "sell_put", label: "Sell Put", futureOnly: true },
  { value: "sell_call", label: "Sell Call", futureOnly: true },
  { value: "leaps", label: "LEAPS" },
  { value: "vertical_call_spread", label: "Vertical Call Spread" },
];

export const TRADE_STATUS_OPTIONS: {
  value: TradeTrackerStatus;
  label: string;
}[] = [
  { value: "open", label: "Open" },
  { value: "closed", label: "Closed" },
  { value: "managed", label: "Managed" },
  { value: "rolled", label: "Rolled" },
];

export const CONFIDENCE_LEVELS = [
  "High",
  "Medium",
  "Low",
] as const;

export const DEFAULT_TAKE_PROFIT_PCT = 75;
export const DEFAULT_STOP_LOSS_PCT = 175;
/** Per-contract close price retains 25% of premium at 75% profit target */
export const TP_REMAINING_PCT = 0.25;
/** Estimated per-contract transaction fee when closing at take profit */
export const TP_CLOSE_FEE = 0.01;
export const DTE_WARNING_THRESHOLD = 14;
export const DTE_COMFORT_THRESHOLD = 21;
export const DTE_URGENT_THRESHOLD = 7;
export const BREAKEVEN_PROXIMITY_PCT = 1.5;
export const SR_DANGER_ATR_MULTIPLIER = 1;
