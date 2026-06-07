import { getEnrichedPortfolioMetrics } from "@/lib/portfolio/enrich-capital-pools";
import { getFinancialGoalsData } from "@/lib/supabase/queries/goals";
import { getMonthlyContributionTrackerData } from "@/lib/supabase/queries/monthly-contributions";
import { getStockEtfTrackerData } from "@/lib/supabase/queries/stock-etf-holdings";
import { getOptionsTradesData } from "@/lib/supabase/queries/options-trades";
import { getPortfolioHistoryData } from "@/lib/supabase/queries/daily-portfolio-snapshots";
import { buildCategoryValuesSgd } from "@/lib/stocks-etfs/build-tab-data";
import { isSupabaseConfigured } from "@/lib/supabase/is-configured";
import { createClient } from "@/lib/supabase/server";
import { FinancialGoalsClient } from "./FinancialGoalsClient";

async function resolveUserId(): Promise<string> {
  if (!isSupabaseConfigured()) return "mock-user";
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user?.id ?? "mock-user";
}

export async function FinancialGoalsDashboard() {
  const userId = await resolveUserId();
  const [contributionData, stockData, tradesData] =
    await Promise.all([
      getMonthlyContributionTrackerData(),
      getStockEtfTrackerData(),
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

  const categories = buildCategoryValuesSgd(stockData.holdings);
  return (
    <FinancialGoalsClient
      initialData={data}
      categoryValues={categories}
      portfolioHistory={portfolioHistory}
      contributionData={contributionData}
    />
  );
}
