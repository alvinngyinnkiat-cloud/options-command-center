import type { FinancialGoal } from "@/types/database";
import type { GoalLiveContext } from "./goal-models";

export function resolveGoalCurrentValue(
  goal: FinancialGoal,
  ctx: GoalLiveContext
): number {
  switch (goal.goal_type) {
    case "net_worth":
      return ctx.portfolioCurrentSgd;
    case "income":
      return ctx.passiveIncomeMonthlySgd;
    default:
      return Number(goal.current_amount);
  }
}

export function computePassiveIncomeMonthlySgd(
  usSummary: {
    totalAnnualPremiumIncome: number;
    totalAnnualDividendIncome: number;
  },
  sgSummary: { totalAnnualDividendIncome: number }
): number {
  const annual =
    usSummary.totalAnnualPremiumIncome +
    usSummary.totalAnnualDividendIncome +
    sgSummary.totalAnnualDividendIncome;
  return annual / 12;
}
