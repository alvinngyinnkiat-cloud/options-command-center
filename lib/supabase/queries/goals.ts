import { mapContributionsToGoals } from "@/lib/contributions/map-to-goals";
import { buildGoalsDashboardData } from "@/lib/goals/calculations";
import type { GoalsDashboardData, GoalsRawInput } from "@/lib/goals/types";
import {
  DEFAULT_ASSUMED_YIELD_PCT,
  DEFAULT_PASSIVE_INCOME_TARGET_SGD,
  DEFAULT_PORTFOLIO_TARGET_SGD,
} from "@/lib/goals/types";
import { MOCK_REFERENCE_DATE } from "@/lib/mock/reference-dates";
import { getEnrichedPortfolioMetrics } from "@/lib/portfolio/enrich-capital-pools";
import { getMonthlyContributionTrackerData } from "@/lib/supabase/queries/monthly-contributions";
import {
  getFinancialGoalsManagementData,
  listFinancialGoalRows,
} from "@/lib/supabase/queries/financial-goals";
import { isSupabaseConfigured } from "@/lib/supabase/is-configured";
import { resolveAuthenticatedUserId } from "@/lib/supabase/resolve-user";
import type { FinancialGoal } from "@/types/database";
import type { PassiveIncomeBreakdown } from "@/lib/goals/passive-income-breakdown";
import { EMPTY_PASSIVE_INCOME_BREAKDOWN } from "@/lib/goals/passive-income-breakdown";

function mapGoalsFromRows(
  goals: FinancialGoal[],
  portfolioCurrentSgd: number,
  passiveIncomeMonthlySgd: number,
  passiveIncomeBreakdown: PassiveIncomeBreakdown,
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
    passiveIncomeBreakdown,
  };
}

async function buildEmptyGoalsDashboard(): Promise<GoalsDashboardData> {
  const contributionTracker = await getMonthlyContributionTrackerData();
  const raw = mapGoalsFromRows(
    [],
    0,
    0,
    EMPTY_PASSIVE_INCOME_BREAKDOWN,
    0,
    MOCK_REFERENCE_DATE,
    MOCK_REFERENCE_DATE,
    contributionTracker
  );
  return {
    ...buildGoalsDashboardData(raw, isSupabaseConfigured() ? "supabase" : "mock"),
    managedGoals: [],
    changeHistory: [],
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
      : 0;

  return mapGoalsFromRows(
    await listFinancialGoalRows(userId),
    management.liveContext.portfolioCurrentSgd,
    management.liveContext.passiveIncomeMonthlySgd,
    management.liveContext.passiveIncomeBreakdown,
    netContributionsSgd,
    management.liveContext.inceptionDate,
    management.liveContext.asOfDate,
    contributionTracker
  );
}

export async function getFinancialGoalsData(): Promise<GoalsDashboardData> {
  if (!isSupabaseConfigured()) {
    return buildEmptyGoalsDashboard();
  }

  try {
    const userId = await resolveAuthenticatedUserId();
    if (!userId) {
      return buildEmptyGoalsDashboard();
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
    return buildEmptyGoalsDashboard();
  }
}
