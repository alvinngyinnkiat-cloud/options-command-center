import type { GoalType } from "@/types/database";
import type { PassiveIncomeBreakdown } from "./passive-income-breakdown";
import {
  DEFAULT_ASSUMED_YIELD_PCT,
  DEFAULT_PASSIVE_INCOME_TARGET_SGD,
  DEFAULT_PORTFOLIO_TARGET_SGD,
} from "./types";

export interface FinancialGoalFormInput {
  name: string;
  goalType: GoalType;
  targetAmount: number;
  currentAmount?: number;
  targetDate: string | null;
  startDate: string | null;
  notes: string | null;
  assumedYieldPct?: number | null;
}

export interface GoalChangeRecord {
  id: string;
  goalId: string;
  goalName: string;
  fieldName: string;
  previousValue: string | null;
  newValue: string | null;
  changeReason: string | null;
  createdAt: string;
}

export interface ManagedFinancialGoal {
  id: string;
  name: string;
  goalType: GoalType;
  categoryLabel: string;
  targetAmount: number;
  currentValue: number;
  targetDate: string | null;
  startDate: string | null;
  notes: string | null;
  isArchived: boolean;
  assumedYieldPct: number | null;
  isMonthlyTarget: boolean;
  progressPercent: number;
  remainingAmount: number;
  daysRemaining: number | null;
  projectedCompletionDate: string | null;
  isCompleted: boolean;
  /** Shown on income goals — how current monthly passive income is derived. */
  calculationSource?: string;
}

export interface GoalLiveContext {
  portfolioCurrentSgd: number;
  passiveIncomeMonthlySgd: number;
  passiveIncomeBreakdown: PassiveIncomeBreakdown;
  asOfDate: string;
  inceptionDate: string;
  averageMonthlyContribution: number;
  actualCagr: number;
}

export interface FinancialGoalsPageData {
  goals: ManagedFinancialGoal[];
  changeHistory: GoalChangeRecord[];
}

/** Seeds stored in DB on first use — not used for display when goals exist. */
export const DEFAULT_GOAL_SEEDS: Omit<
  FinancialGoalFormInput,
  "currentAmount"
>[] = [
  {
    name: "Portfolio Value",
    goalType: "net_worth",
    targetAmount: DEFAULT_PORTFOLIO_TARGET_SGD,
    targetDate: "2028-12-31",
    startDate: "2024-01-15",
    notes: "My portfolio value target (SGD). Excludes client capital.",
    assumedYieldPct: null,
  },
  {
    name: "Passive Income",
    goalType: "income",
    targetAmount: DEFAULT_PASSIVE_INCOME_TARGET_SGD,
    targetDate: "2028-12-31",
    startDate: "2024-01-15",
    notes: "Monthly passive income from premiums and dividends.",
    assumedYieldPct: DEFAULT_ASSUMED_YIELD_PCT,
  },
];

export function goalCategoryLabel(goalType: GoalType): string {
  switch (goalType) {
    case "net_worth":
      return "Portfolio";
    case "income":
      return "Passive Income";
    case "allocation":
      return "Allocation";
    case "risk_capacity":
      return "Risk Capacity";
    default:
      return "Custom";
  }
}

export function isMonthlyGoalType(goalType: GoalType): boolean {
  return goalType === "income";
}
