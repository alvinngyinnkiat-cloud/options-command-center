import type { GoalLiveContext } from "./goal-models";

export function resolveGoalCurrentValue(
  goal: import("@/types/database").FinancialGoal,
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
