/**
 * Core trading system rules — see PROJECT_RULES.md for the canonical source.
 * Support/resistance are MANUAL inputs only (never auto-generated).
 */

export const TRADING_RULES = {
  strategies: [
    "Bull Put Spreads",
    "Bear Call Spreads",
    "Iron Condors",
  ] as const,

  takeProfitPercent: 75,
  stopLossPercent: 175,
  maxOptionsAllocationPercent: 75,
  maxRiskPerTradePercent: 2.5,

  supportResistance: {
    manualOnly: true,
    autoGenerate: false,
    timeframes: ["Daily", "Weekly"] as const,
  },
} as const;

export type TradingStrategy = (typeof TRADING_RULES.strategies)[number];
