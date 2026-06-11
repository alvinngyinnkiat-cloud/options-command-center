import { format } from "date-fns";
import type {
  ContributionChartPeriod,
  ContributionChartPoint,
  MonthlyContributionRecord,
  YtdContributionBreakdown,
} from "./types";

export type { ContributionChartPeriod, ContributionChartPoint, YtdContributionBreakdown };

export function calculateTotalContribution(
  stockOptionsAmountSgd: number,
  cryptoAmountSgd: number
): number {
  return stockOptionsAmountSgd + cryptoAmountSgd;
}

export function formatContributionMonthLabel(
  month: number,
  year: number
): string {
  const date = new Date(Date.UTC(year, month - 1, 1, 12, 0, 0));
  return format(date, "MMM yyyy");
}

export function sortContributions(
  contributions: MonthlyContributionRecord[]
): MonthlyContributionRecord[] {
  return [...contributions].sort((a, b) => {
    if (a.contributionYear !== b.contributionYear) {
      return a.contributionYear - b.contributionYear;
    }
    return a.contributionMonth - b.contributionMonth;
  });
}

export function calculateYtdContributions(
  contributions: MonthlyContributionRecord[],
  year: number
): number {
  return contributions
    .filter((c) => c.contributionYear === year)
    .reduce((sum, c) => sum + c.totalAmountSgd, 0);
}

export function calculateAllTimeContributions(
  contributions: MonthlyContributionRecord[]
): number {
  return contributions.reduce((sum, c) => sum + c.totalAmountSgd, 0);
}

export function buildContributionYearOptions(
  contributions: MonthlyContributionRecord[],
  defaultYear: number
): number[] {
  const years = new Set<number>([
    defaultYear,
    new Date().getFullYear(),
    ...contributions.map((c) => c.contributionYear),
  ]);
  const min = Math.min(2024, ...years);
  const max = Math.max(2027, ...years);
  const options: number[] = [];
  for (let year = min; year <= max; year++) {
    options.push(year);
  }
  return options.sort((a, b) => b - a);
}

export function calculateYtdBreakdown(
  contributions: MonthlyContributionRecord[],
  year: number
): YtdContributionBreakdown {
  const yearRows = contributions.filter((c) => c.contributionYear === year);
  const stockOptionsAmountSgd = yearRows.reduce(
    (s, c) => s + c.stockOptionsAmountSgd,
    0
  );
  const cryptoAmountSgd = yearRows.reduce((s, c) => s + c.cryptoAmountSgd, 0);
  const totalAmountSgd = stockOptionsAmountSgd + cryptoAmountSgd;
  const stockOptionsPct =
    totalAmountSgd > 0 ? (stockOptionsAmountSgd / totalAmountSgd) * 100 : 0;
  const cryptoPct =
    totalAmountSgd > 0 ? (cryptoAmountSgd / totalAmountSgd) * 100 : 0;

  return {
    stockOptionsAmountSgd,
    cryptoAmountSgd,
    totalAmountSgd,
    stockOptionsPct,
    cryptoPct,
  };
}

export function calculateAverageMonthlyContribution(
  contributions: MonthlyContributionRecord[]
): number {
  const withAmounts = contributions.filter((c) => c.totalAmountSgd > 0);
  if (withAmounts.length === 0) return 0;
  const total = withAmounts.reduce((sum, c) => sum + c.totalAmountSgd, 0);
  return total / withAmounts.length;
}

function sumBucket(
  rows: MonthlyContributionRecord[]
): Pick<ContributionChartPoint, "stockOptions" | "crypto" | "total"> {
  const stockOptions = rows.reduce((s, c) => s + c.stockOptionsAmountSgd, 0);
  const crypto = rows.reduce((s, c) => s + c.cryptoAmountSgd, 0);
  return { stockOptions, crypto, total: stockOptions + crypto };
}

export function buildContributionChartData(
  contributions: MonthlyContributionRecord[],
  period: ContributionChartPeriod,
  focusYear: number
): ContributionChartPoint[] {
  const sorted = sortContributions(contributions);

  if (period === "monthly") {
    return sorted
      .filter((c) => c.contributionYear === focusYear)
      .map((c) => ({
        label: formatContributionMonthLabel(
          c.contributionMonth,
          c.contributionYear
        ),
        stockOptions: c.stockOptionsAmountSgd,
        crypto: c.cryptoAmountSgd,
        total: c.totalAmountSgd,
      }));
  }

  if (period === "quarterly") {
    const quarters = [
      { label: `Q1 ${focusYear}`, months: [1, 2, 3] },
      { label: `Q2 ${focusYear}`, months: [4, 5, 6] },
      { label: `Q3 ${focusYear}`, months: [7, 8, 9] },
      { label: `Q4 ${focusYear}`, months: [10, 11, 12] },
    ];
    return quarters.map(({ label, months }) => {
      const rows = sorted.filter(
        (c) => c.contributionYear === focusYear && months.includes(c.contributionMonth)
      );
      return { label, ...sumBucket(rows) };
    });
  }

  const years = [...new Set(sorted.map((c) => c.contributionYear))].sort();
  return years.map((year) => {
    const rows = sorted.filter((c) => c.contributionYear === year);
    return { label: String(year), ...sumBucket(rows) };
  });
}

export function buildMonthlyContributionTrackerData(
  contributions: MonthlyContributionRecord[],
  currentYear: number,
  dataSource: "supabase" | "mock"
) {
  const sorted = sortContributions(contributions);
  const ytdBreakdown = calculateYtdBreakdown(sorted, currentYear);
  return {
    contributions: sorted,
    ytdContributions: ytdBreakdown.totalAmountSgd,
    ytdBreakdown,
    allTimeContributions: calculateAllTimeContributions(sorted),
    averageMonthlyContribution: calculateAverageMonthlyContribution(sorted),
    currentYear,
    dataSource,
  };
}
