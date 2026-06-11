import { getEnrichedPortfolioMetrics } from "@/lib/portfolio/enrich-capital-pools";
import { buildPersonalPortfolioProfitLoss } from "@/lib/portfolio/personal-profit-loss";
import { getMonthlyContributionTrackerData } from "@/lib/supabase/queries/monthly-contributions";
import { getDataHealthWidget } from "@/lib/data-health/run-health-check";
import { isSupabaseConfigured } from "@/lib/supabase/is-configured";
import { MOCK_USER_ID, resolveAuthenticatedUserId } from "@/lib/supabase/resolve-user";
import { PortfolioDashboardClient } from "./PortfolioDashboardClient";

async function resolveUserId(): Promise<string> {
  if (!isSupabaseConfigured()) return MOCK_USER_ID;
  return (await resolveAuthenticatedUserId()) ?? MOCK_USER_ID;
}

export async function PortfolioDashboard() {
  const userId = await resolveUserId();
  const [{ metrics, capitalPools }, contributionData, dataHealthLines] =
    await Promise.all([
      getEnrichedPortfolioMetrics(),
      getMonthlyContributionTrackerData(),
      getDataHealthWidget(userId),
    ]);

  const personalProfitLoss = buildPersonalPortfolioProfitLoss(
    capitalPools.myPortfolioValue,
    contributionData.allTimeContributions
  );

  return (
    <PortfolioDashboardClient
      initialMetrics={metrics}
      capitalPools={capitalPools}
      personalProfitLoss={personalProfitLoss}
      dataHealthLines={dataHealthLines}
    />
  );
}
