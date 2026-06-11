import { parseStableDate } from "@/lib/format/datetime";
import { calculateAnnualizedReturn } from "@/lib/portfolio/calculations";
import type { FinancialGoal } from "@/types/database";
import {
  calculateProgressPercent,
  calculateRequiredPortfolioSize,
  estimateCompletionDate,
  formatGoalDate,
} from "./calculations";
import {
  goalCategoryLabel,
  isMonthlyGoalType,
  type GoalLiveContext,
  type ManagedFinancialGoal,
} from "./goal-models";
import { resolveGoalCurrentValue } from "./resolve-current-value";
import { formatPassiveIncomeCalculationSource } from "./passive-income-breakdown";
import type { PassiveIncomeBreakdown } from "./passive-income-breakdown";

function daysUntil(targetDate: string | null, asOfDate: string): number | null {
  if (!targetDate) return null;
  const end = parseStableDate(targetDate);
  const start = parseStableDate(asOfDate);
  const days = Math.ceil(
    (end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)
  );
  return Math.max(0, days);
}

function projectCompletionForGoal(
  goal: FinancialGoal,
  current: number,
  ctx: GoalLiveContext
): string | null {
  if (goal.goal_type === "net_worth") {
    const estimated = estimateCompletionDate(
      current,
      Number(goal.target_amount),
      ctx.actualCagr,
      ctx.averageMonthlyContribution,
      parseStableDate(ctx.asOfDate)
    );
    return formatGoalDate(estimated);
  }

  if (goal.goal_type === "income") {
    const yieldPct =
      goal.assumed_yield_pct != null
        ? Number(goal.assumed_yield_pct)
        : 4;
    const requiredPortfolio = calculateRequiredPortfolioSize(
      Number(goal.target_amount),
      yieldPct
    );
    const estimated = estimateCompletionDate(
      ctx.portfolioCurrentSgd,
      requiredPortfolio,
      ctx.actualCagr,
      ctx.averageMonthlyContribution,
      parseStableDate(ctx.asOfDate)
    );
    return formatGoalDate(estimated);
  }

  return null;
}

export function buildManagedGoal(
  goal: FinancialGoal,
  ctx: GoalLiveContext
): ManagedFinancialGoal {
  const currentValue = resolveGoalCurrentValue(goal, ctx);
  const targetAmount = Number(goal.target_amount);
  const progressPercent = calculateProgressPercent(currentValue, targetAmount);
  const remainingAmount = Math.max(0, targetAmount - currentValue);
  const isCompleted = progressPercent >= 100;

  return {
    id: goal.id,
    name: goal.name,
    goalType: goal.goal_type,
    categoryLabel: goalCategoryLabel(goal.goal_type),
    targetAmount,
    currentValue,
    targetDate: goal.target_date,
    startDate: goal.start_date,
    notes: goal.notes,
    isArchived: goal.is_archived,
    assumedYieldPct:
      goal.assumed_yield_pct != null ? Number(goal.assumed_yield_pct) : null,
    isMonthlyTarget: isMonthlyGoalType(goal.goal_type),
    progressPercent,
    remainingAmount,
    daysRemaining: daysUntil(goal.target_date, ctx.asOfDate),
    projectedCompletionDate: isCompleted
      ? ctx.asOfDate
      : projectCompletionForGoal(goal, currentValue, ctx),
    isCompleted,
    calculationSource:
      goal.goal_type === "income"
        ? formatPassiveIncomeCalculationSource(ctx.passiveIncomeBreakdown)
        : undefined,
  };
}

export function buildManagedGoals(
  goals: FinancialGoal[],
  ctx: GoalLiveContext
): ManagedFinancialGoal[] {
  return goals
    .filter((g) => g.is_active)
    .map((g) => buildManagedGoal(g, ctx));
}

export function buildGoalLiveContext(input: {
  portfolioCurrentSgd: number;
  passiveIncomeMonthlySgd: number;
  passiveIncomeBreakdown: PassiveIncomeBreakdown;
  asOfDate: string;
  inceptionDate: string;
  netContributions: number;
  averageMonthlyContribution: number;
}): GoalLiveContext {
  const actualCagr = calculateAnnualizedReturn(
    input.portfolioCurrentSgd,
    input.netContributions,
    input.inceptionDate,
    input.asOfDate
  );

  return {
    portfolioCurrentSgd: input.portfolioCurrentSgd,
    passiveIncomeMonthlySgd: input.passiveIncomeMonthlySgd,
    passiveIncomeBreakdown: input.passiveIncomeBreakdown,
    asOfDate: input.asOfDate,
    inceptionDate: input.inceptionDate,
    averageMonthlyContribution: input.averageMonthlyContribution,
    actualCagr,
  };
}

export function partitionManagedGoals(goals: ManagedFinancialGoal[]): {
  active: ManagedFinancialGoal[];
  completed: ManagedFinancialGoal[];
  archived: ManagedFinancialGoal[];
} {
  const archived = goals.filter((g) => g.isArchived);
  const live = goals.filter((g) => !g.isArchived);
  const completed = live.filter((g) => g.isCompleted);
  const active = live.filter((g) => !g.isCompleted);
  return { active, completed, archived };
}
