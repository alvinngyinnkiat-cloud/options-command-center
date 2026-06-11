import type { DataSource } from "@/lib/portfolio/types";
import type {
  GoalChangeRecord,
  ManagedFinancialGoal,
} from "./goal-models";
import type { PassiveIncomeBreakdown } from "./passive-income-breakdown";

export type {
  FinancialGoalFormInput,
  GoalChangeRecord,
  ManagedFinancialGoal,
} from "./goal-models";

export interface MonthlyContribution {
  id: string;
  month: number;
  year: number;
  monthLabel: string;
  stockOptionsAmountSgd: number;
  cryptoAmountSgd: number;
  totalAmountSgd: number;
  notes: string | null;
}

export interface GoalsRawInput {
  portfolioTarget: number;
  portfolioCurrent: number;
  portfolioTargetDate: string | null;
  passiveIncomeTarget: number;
  passiveIncomeCurrent: number;
  inceptionDate: string;
  /** Stable "today" for projections — avoids Date.now() hydration drift in mock/SSR. */
  asOfDate?: string;
  netContributions: number;
  assumedYieldPct: number;
  monthlyContributions: MonthlyContribution[];
  averageMonthlyContribution: number;
  passiveIncomeBreakdown: PassiveIncomeBreakdown;
}

export interface GoalProgress {
  label: string;
  current: number;
  target: number;
  progressPercent: number;
  estimatedCompletion: string | null;
}

export interface PortfolioGoalMetrics {
  targetValue: number;
  currentValue: number;
  progressPercent: number;
  requiredCagr: number;
  actualCagr: number;
  estimatedCompletion: string | null;
  targetDate: string | null;
}

export interface PassiveIncomeGoalMetrics {
  targetMonthly: number;
  currentMonthly: number;
  progressPercent: number;
  estimatedCompletion: string | null;
  requiredPortfolioSize: number;
  assumedYieldPct: number;
}

export interface TimelinePoint {
  label: string;
  portfolioValue: number;
  passiveIncome: number;
  portfolioTarget: number;
  incomeTarget: number;
}

export interface GoalsDashboardData {
  portfolioGoal: PortfolioGoalMetrics;
  passiveIncomeGoal: PassiveIncomeGoalMetrics;
  portfolioProgress: GoalProgress;
  passiveProgress: GoalProgress;
  timeline: TimelinePoint[];
  monthlyContributions: MonthlyContribution[];
  ytdContributions: number;
  ytdContributionBreakdown: {
    stockOptionsAmountSgd: number;
    cryptoAmountSgd: number;
    totalAmountSgd: number;
    stockOptionsPct: number;
    cryptoPct: number;
  };
  dataSource: DataSource;
  raw: GoalsRawInput;
  passiveIncomeBreakdown: PassiveIncomeBreakdown;
  managedGoals: ManagedFinancialGoal[];
  changeHistory: GoalChangeRecord[];
}

export const DEFAULT_PORTFOLIO_TARGET_SGD = 100_000;
export const DEFAULT_PASSIVE_INCOME_TARGET_SGD = 10_000;
export const DEFAULT_ASSUMED_YIELD_PCT = 4;
