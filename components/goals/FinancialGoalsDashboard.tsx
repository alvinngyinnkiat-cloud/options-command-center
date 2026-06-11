import { getEnrichedPortfolioMetrics } from "@/lib/portfolio/enrich-capital-pools";
import { getFinancialGoalsData } from "@/lib/supabase/queries/goals";
import { getMonthlyContributionTrackerData } from "@/lib/supabase/queries/monthly-contributions";
import { getOptionsTradesData } from "@/lib/supabase/queries/options-trades";
import { getPortfolioHistoryData } from "@/lib/supabase/queries/daily-portfolio-snapshots";
import { isSupabaseConfigured } from "@/lib/supabase/is-configured";
import { MOCK_USER_ID, resolveAuthenticatedUserId } from "@/lib/supabase/resolve-user";
import { FinancialGoalsClient } from "./FinancialGoalsClient";

async function resolveUserId(): Promise<string> {
  if (!isSupabaseConfigured()) return MOCK_USER_ID;
  return (await resolveAuthenticatedUserId()) ?? MOCK_USER_ID;
}

export async function FinancialGoalsDashboard() {
  const userId = await resolveUserId();
  const [contributionData, tradesData] = await Promise.all([
    getMonthlyContributionTrackerData(),
    getOptionsTradesData(),
  ]);

  const [{ metrics, capitalPools }, data] = await Promise.all([
    getEnrichedPortfolioMetrics(),
    getFinancialGoalsData(),
  ]);

  const portfolioHistory = await getPortfolioHistoryData({
    userId,
    metrics,
    trades: tradesData.trades,
    capitalPools,
  });

  return (
    <FinancialGoalsClient
      initialData={data}
      portfolioHistory={portfolioHistory}
      contributionData={contributionData}
    />
  );
}
