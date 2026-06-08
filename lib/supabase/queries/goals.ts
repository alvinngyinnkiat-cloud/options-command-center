import { mapContributionsToGoals } from "@/lib/contributions/map-to-goals";
import { buildGoalsDashboardData } from "@/lib/goals/calculations";
import type { GoalsDashboardData, GoalsRawInput } from "@/lib/goals/types";
import {
  DEFAULT_ASSUMED_YIELD_PCT,
  DEFAULT_PASSIVE_INCOME_TARGET_SGD,
  DEFAULT_PORTFOLIO_TARGET_SGD,
} from "@/lib/goals/types";
import { MOCK_GOALS_RAW } from "@/lib/mock/goals";
import { MOCK_REFERENCE_DATE } from "@/lib/mock/reference-dates";
import { getEnrichedPortfolioMetrics } from "@/lib/portfolio/enrich-capital-pools";
import { getMonthlyContributionTrackerData } from "@/lib/supabase/queries/monthly-contributions";
import {
  getPortfolioHistoryData,
  getLatestDailySnapshot,
} from "@/lib/supabase/queries/daily-portfolio-snapshots";
import { getOptionsTradesData } from "@/lib/supabase/queries/options-trades";
import {
  getFinancialGoalsManagementData,
  listFinancialGoalRows,
} from "@/lib/supabase/queries/financial-goals";
import { isSupabaseConfigured } from "@/lib/supabase/is-configured";
import { resolveAuthenticatedUserId } from "@/lib/supabase/resolve-user";
import type { FinancialGoal } from "@/types/database";

function mapGoalsFromRows(
  goals: FinancialGoal[],
  portfolioCurrentSgd: number,
  passiveIncomeMonthlySgd: number,
  netContributionsSgd: number,
  inceptionDate: string,
  asOfDate: string,
  contributionTracker: Awaited<ReturnType<typeof getMonthlyContributionTrackerData>>
): GoalsRawInput {
  const activeGoals = goals.filter((g) => g.is_active && !g.is_archived);
  const portfolioGoal = activeGoals.find((g) => g.goal_type === "net_worth");
  const incomeGoal = activeGoals.find((g) => g.goal_type === "income");

  const monthlyContributions = mapContributionsToGoals(
    contributionTracker.contributions
  );

  const assumedYield =
    incomeGoal?.assumed_yield_pct != null
      ? Number(incomeGoal.assumed_yield_pct)
      : DEFAULT_ASSUMED_YIELD_PCT;

  return {
    portfolioTarget: portfolioGoal
      ? Number(portfolioGoal.target_amount)
      : DEFAULT_PORTFOLIO_TARGET_SGD,
    portfolioCurrent: portfolioCurrentSgd,
    portfolioTargetDate: portfolioGoal?.target_date ?? "2028-12-31",
    passiveIncomeTarget: incomeGoal
      ? Number(incomeGoal.target_amount)
      : DEFAULT_PASSIVE_INCOME_TARGET_SGD,
    passiveIncomeCurrent: passiveIncomeMonthlySgd,
    inceptionDate: portfolioGoal?.start_date ?? inceptionDate,
    asOfDate,
    netContributions: netContributionsSgd,
    assumedYieldPct: assumedYield,
    monthlyContributions,
    averageMonthlyContribution: contributionTracker.averageMonthlyContribution,
  };
}

async function fetchGoalsFromSupabase(
  userId: string
): Promise<GoalsRawInput> {
  const [management, contributionTracker, enriched] = await Promise.all([
    getFinancialGoalsManagementData(userId),
    getMonthlyContributionTrackerData(),
    getEnrichedPortfolioMetrics(),
  ]);

  const netContributionsSgd =
    enriched.metrics.dataSource === "supabase"
      ? enriched.metrics.netContributions
      : MOCK_GOALS_RAW.netContributions;

  return mapGoalsFromRows(
    await listFinancialGoalRows(userId),
    management.liveContext.portfolioCurrentSgd,
    management.liveContext.passiveIncomeMonthlySgd,
    netContributionsSgd,
    management.liveContext.inceptionDate,
    management.liveContext.asOfDate,
    contributionTracker
  );
}

async function buildMockGoalsDashboard(): Promise<GoalsDashboardData> {
  const { metrics: portfolioMetrics, capitalPools } =
    await getEnrichedPortfolioMetrics();
  const tradesData = await getOptionsTradesData();
  const history = await getPortfolioHistoryData({
    userId: "mock-user",
    metrics: portfolioMetrics,
    trades: tradesData.trades,
  });

  const management = await getFinancialGoalsManagementData("mock-user");
  const contributionTracker = await getMonthlyContributionTrackerData();

  const latestValue =
    history.latest?.portfolioValueSgd ?? capitalPools.myPortfolioValue;
  const asOfDate =
    history.latest?.snapshotDate ??
    MOCK_GOALS_RAW.asOfDate ??
    MOCK_REFERENCE_DATE;

  const raw = mapGoalsFromRows(
    await listFinancialGoalRows("mock-user"),
    latestValue,
    management.liveContext.passiveIncomeMonthlySgd,
    MOCK_GOALS_RAW.netContributions,
    management.liveContext.inceptionDate,
    asOfDate,
    contributionTracker
  );

  return {
    ...buildGoalsDashboardData({ ...raw, portfolioCurrent: latestValue, asOfDate }, "mock"),
    managedGoals: management.goals,
    changeHistory: management.changeHistory,
  };
}

export async function getFinancialGoalsData(): Promise<GoalsDashboardData> {
  if (!isSupabaseConfigured()) {
    return buildMockGoalsDashboard();
  }

  try {
    const userId = await resolveAuthenticatedUserId();
    if (!userId) {
      const contributionTracker = await getMonthlyContributionTrackerData();
      const emptyRaw = mapGoalsFromRows(
        [],
        0,
        0,
        0,
        MOCK_GOALS_RAW.inceptionDate,
        MOCK_REFERENCE_DATE,
        contributionTracker
      );
      return {
        ...buildGoalsDashboardData(emptyRaw, "supabase"),
        managedGoals: [],
        changeHistory: [],
      };
    }

    const [raw, management] = await Promise.all([
      fetchGoalsFromSupabase(userId),
      getFinancialGoalsManagementData(userId),
    ]);

    return {
      ...buildGoalsDashboardData(raw, "supabase"),
      managedGoals: management.goals,
      changeHistory: management.changeHistory,
    };
  } catch {
    return buildMockGoalsDashboard();
  }
}
