export interface DailyPortfolioSnapshot {
  id: string;
  snapshotDate: string;
  portfolioValueSgd: number;
  stockOptionsValueSgd: number;
  cryptoValueSgd: number;
  usdCash: number;
  sgdCash: number;
  usdCashSgdEquivalent: number;
  tradingCashSgd: number;
  cryptoCashSgd: number;
  tradingCapitalSgd: number;
  totalCashSgd: number;
  openRisk: number;
  availableRiskCapacity: number;
  personalUnrealizedPnl: number;
  personalRealizedPnl: number;
  clientPnl: number;
  clientInitialCapitalSgd: number;
  clientCurrentValueSgd: number;
  totalAssetsManagedSgd: number;
  portfolioHealthScore: number | null;
  notes: string | null;
  createdAt: string;
}

export interface PortfolioHistoryTableRow {
  id: string;
  snapshotDate: string;
  portfolioValueSgd: number;
  clientCurrentValueSgd: number;
  totalAssetsManagedSgd: number;
  dailyChange: number | null;
  dailyChangePct: number | null;
  weeklyChange: number | null;
  weeklyChangePct: number | null;
  monthlyChange: number | null;
  monthlyChangePct: number | null;
  notes: string | null;
}

export interface ThresholdMilestone {
  label: string;
  thresholdSgd: number;
  reachedDate: string | null;
  isCustom?: boolean;
}

/** Historical first-time achievement (My Portfolio Value only). */
export interface AchievementMilestone {
  label: string;
  thresholdSgd: number;
  reachedDate: string | null;
  /** True when earliest snapshot is already at/above threshold — date unknown. */
  insufficientData: boolean;
}

/** Forward-looking goal progress (My Portfolio Value only). */
export interface GoalProgressMilestone {
  id?: string;
  label: string;
  goalValueSgd: number;
  currentValueSgd: number;
  progressPct: number;
  remainingSgd: number;
  isCustom?: boolean;
}

export interface PortfolioCurrentState {
  portfolioValue: number;
  dailyChange: number | null;
  dailyChangePct: number | null;
  availableRiskCapacity: number;
  openRisk: number;
  cashAvailability: number;
  lastUpdated: string | null;
}

export type PortfolioHistoryPeriod = "7D" | "30D" | "90D" | "YTD" | "1Y" | "ALL";

export interface PortfolioHistoryComparison {
  label: string;
  referenceDate: string;
  portfolioValue: number | null;
  difference: number | null;
  differencePct: number | null;
}

export interface PortfolioPerformanceMetrics {
  dailyChange: number | null;
  dailyChangePct: number | null;
  weeklyChange: number | null;
  weeklyChangePct: number | null;
  monthlyChange: number | null;
  monthlyChangePct: number | null;
  quarterlyChange: number | null;
  quarterlyChangePct: number | null;
  ytdChange: number | null;
  ytdChangePct: number | null;
  allTimeChange: number | null;
  allTimeChangePct: number | null;
}

export interface PortfolioMilestones {
  highest: { value: number; date: string } | null;
  lowest: { value: number; date: string } | null;
  current: number | null;
  average: number | null;
}

export interface PortfolioHistoryData {
  snapshots: DailyPortfolioSnapshot[];
  latest: DailyPortfolioSnapshot | null;
  comparisons: PortfolioHistoryComparison[];
  performance: PortfolioPerformanceMetrics;
  milestones: PortfolioMilestones;
  dataSource: "supabase" | "mock";
}
