import { TRADING_RULES } from "@/lib/constants/trading-rules";
import type { RiskSettingsSnapshot } from "@/lib/risk/types";

export const MOCK_RISK_SETTINGS: RiskSettingsSnapshot = {
  takeProfitPercent: TRADING_RULES.takeProfitPercent,
  maxOptionsAllocationPercent: TRADING_RULES.maxOptionsAllocationPercent,
  maxRiskPerTradePercent: TRADING_RULES.maxRiskPerTradePercent,
};
