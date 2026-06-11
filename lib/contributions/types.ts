import type { DataSource } from "@/lib/portfolio/types";

export interface YtdContributionBreakdown {
  stockOptionsAmountSgd: number;
  cryptoAmountSgd: number;
  totalAmountSgd: number;
  stockOptionsPct: number;
  cryptoPct: number;
}

export interface MonthlyContributionRecord {
  id: string;
  contributionMonth: number;
  contributionYear: number;
  stockOptionsAmountSgd: number;
  cryptoAmountSgd: number;
  totalAmountSgd: number;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface MonthlyContributionFormInput {
  contributionMonth: number;
  contributionYear: number;
  stockOptionsAmountSgd: number;
  cryptoAmountSgd: number;
  notes: string | null;
}

export type ContributionChartPeriod = "monthly" | "quarterly" | "yearly";

export interface ContributionChartPoint {
  label: string;
  stockOptions: number;
  crypto: number;
  total: number;
}

export interface MonthlyContributionTrackerData {
  contributions: MonthlyContributionRecord[];
  ytdContributions: number;
  ytdBreakdown: YtdContributionBreakdown;
  allTimeContributions: number;
  averageMonthlyContribution: number;
  currentYear: number;
  dataSource: DataSource;
}

export type MonthlyContributionActionResult =
  | { success: true; data: MonthlyContributionTrackerData }
  | { success: false; error: string };
