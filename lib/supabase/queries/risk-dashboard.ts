import { MOCK_RISK_SETTINGS } from "@/lib/mock/risk-settings";
import { getEnrichedPortfolioMetrics } from "@/lib/portfolio/enrich-capital-pools";
import { getOptionsTradesData } from "@/lib/supabase/queries/options-trades";
import { buildRiskDashboardData } from "@/lib/risk/summary";
import type { RiskDashboardData, RiskSettingsSnapshot } from "@/lib/risk/types";
import { TRADING_RULES } from "@/lib/constants/trading-rules";
import { isSupabaseConfigured } from "@/lib/supabase/is-configured";
import { resolveAuthenticatedUserId, withSupabaseQuery } from "@/lib/supabase/resolve-user";
import type { RiskSettings } from "@/types/database";

function mapRiskSettings(row: RiskSettings | null): RiskSettingsSnapshot {
  if (!row) return defaultRiskSettings();
  return {
    takeProfitPercent: Number(row.take_profit_percent),
    maxOptionsAllocationPercent: Number(row.max_options_allocation_percent),
    maxRiskPerTradePercent: Number(row.max_risk_per_trade_percent),
  };
}

async function getRiskSettings(_userId: string): Promise<RiskSettingsSnapshot> {
  return withSupabaseQuery(
    async ({ userId, supabase }) => {
      const { data } = await supabase
        .from("risk_settings")
        .select("*")
        .eq("user_id", userId)
        .maybeSingle();

      return mapRiskSettings(data as RiskSettings | null);
    },
    () => defaultRiskSettings()
  );
}

export async function getRiskDashboardData(): Promise<RiskDashboardData> {
  const [{ metrics, capitalPools }, tradesData] = await Promise.all([
    getEnrichedPortfolioMetrics(),
    getOptionsTradesData(),
  ]);

  let settings = defaultRiskSettings();
  const dataSource = metrics.dataSource;

  if (isSupabaseConfigured()) {
    const userId = await resolveAuthenticatedUserId();
    if (userId) {
      settings = await getRiskSettings(userId);
    }
  }

  return buildRiskDashboardData({
    portfolio: metrics,
    trades: tradesData.trades,
    settings,
    dataSource,
    capitalPools,
  });
}

export function defaultRiskSettings(): RiskSettingsSnapshot {
  return {
    takeProfitPercent: TRADING_RULES.takeProfitPercent,
    maxOptionsAllocationPercent: TRADING_RULES.maxOptionsAllocationPercent,
    maxRiskPerTradePercent: TRADING_RULES.maxRiskPerTradePercent,
  };
}
