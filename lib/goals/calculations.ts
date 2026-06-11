import { addMonths } from "date-fns";
import {
  formatMonthYearLabel,
  parseStableDate,
} from "@/lib/format/datetime";
import { calculateAnnualizedReturn } from "@/lib/portfolio/calculations";
import { calculateYtdBreakdown } from "@/lib/contributions/calculations";
import type {
  GoalsDashboardData,
  GoalsRawInput,
  PassiveIncomeGoalMetrics,
  PortfolioGoalMetrics,
  TimelinePoint,
} from "./types";

export function calculateProgressPercent(
  current: number,
  target: number
): number {
  if (target <= 0) return 0;
  return Math.min(100, (current / target) * 100);
}

export function calculateRequiredCagr(
  currentValue: number,
  targetValue: number,
  years: number
): number {
  if (currentValue <= 0 || targetValue <= currentValue || years <= 0) return 0;
  return (Math.pow(targetValue / currentValue, 1 / years) - 1) * 100;
}

export function getMonthlyRate(annualCagrPercent: number): number {
  return Math.pow(1 + annualCagrPercent / 100, 1 / 12) - 1;
}

export function projectPortfolioValue(
  startValue: number,
  months: number,
  monthlyContribution: number,
  annualCagrPercent: number
): number {
  const monthlyRate = getMonthlyRate(annualCagrPercent);
  let value = startValue;
  for (let i = 0; i < months; i++) {
    value = value * (1 + monthlyRate) + monthlyContribution;
  }
  return value;
}

function getGoalsReferenceDate(raw: GoalsRawInput): Date {
  return raw.asOfDate ? parseStableDate(raw.asOfDate) : new Date();
}

export function estimateCompletionDate(
  current: number,
  target: number,
  annualCagrPercent: number,
  monthlyContribution: number,
  fromDate: Date
): Date | null {
  if (current >= target) return fromDate;

  const monthlyRate = getMonthlyRate(annualCagrPercent);
  let value = current;
  let months = 0;
  const maxMonths = 600;

  while (value < target && months < maxMonths) {
    value = value * (1 + monthlyRate) + monthlyContribution;
    months++;
  }

  if (months >= maxMonths) return null;

  const result = new Date(fromDate);
  result.setMonth(result.getMonth() + months);
  return result;
}

export function calculateRequiredCagrWithContributions(
  current: number,
  target: number,
  months: number,
  monthlyContribution: number
): number {
  if (months <= 0 || current >= target) return 0;

  let low = 0;
  let high = 100;

  for (let i = 0; i < 50; i++) {
    const mid = (low + high) / 2;
    const projected = projectPortfolioValue(current, months, monthlyContribution, mid);
    if (projected >= target) {
      high = mid;
    } else {
      low = mid;
    }
  }

  return (low + high) / 2;
}

export function calculateRequiredPortfolioSize(
  targetMonthlyIncome: number,
  assumedYieldPct: number
): number {
  if (assumedYieldPct <= 0) return 0;
  const annualIncome = targetMonthlyIncome * 12;
  return annualIncome / (assumedYieldPct / 100);
}

export function calculatePassiveIncomeFromPortfolio(
  portfolioValue: number,
  assumedYieldPct: number
): number {
  return (portfolioValue * (assumedYieldPct / 100)) / 12;
}

export function yearsBetween(startDate: string, endDate: string): number {
  const start = parseStableDate(startDate);
  const end = parseStableDate(endDate);
  const days = Math.max(1, (end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
  return days / 365.25;
}

export function formatGoalDate(date: Date | null): string | null {
  if (!date) return null;
  return date.toISOString().split("T")[0];
}

export function buildPortfolioGoalMetrics(
  raw: GoalsRawInput
): PortfolioGoalMetrics {
  const referenceDate = getGoalsReferenceDate(raw);
  const actualCagr = calculateAnnualizedReturn(
    raw.portfolioCurrent,
    raw.netContributions,
    raw.inceptionDate,
    raw.asOfDate
  );

  const targetDate = raw.portfolioTargetDate;
  let requiredCagr = 0;

  if (targetDate) {
    const months = Math.max(
      1,
      Math.round(
        yearsBetween(
          raw.asOfDate ?? referenceDate.toISOString().split("T")[0],
          targetDate
        ) * 12
      )
    );
    requiredCagr = calculateRequiredCagrWithContributions(
      raw.portfolioCurrent,
      raw.portfolioTarget,
      months,
      raw.averageMonthlyContribution
    );
  } else {
    const estimated = estimateCompletionDate(
      raw.portfolioCurrent,
      raw.portfolioTarget,
      actualCagr,
      raw.averageMonthlyContribution,
      referenceDate
    );
    if (estimated) {
      const months = Math.max(
        1,
        Math.round(
          (estimated.getTime() - referenceDate.getTime()) /
            (1000 * 60 * 60 * 24 * 30)
        )
      );
      requiredCagr = calculateRequiredCagrWithContributions(
        raw.portfolioCurrent,
        raw.portfolioTarget,
        months,
        raw.averageMonthlyContribution
      );
    }
  }

  const estimatedCompletion = estimateCompletionDate(
    raw.portfolioCurrent,
    raw.portfolioTarget,
    actualCagr,
    raw.averageMonthlyContribution,
    referenceDate
  );

  return {
    targetValue: raw.portfolioTarget,
    currentValue: raw.portfolioCurrent,
    progressPercent: calculateProgressPercent(
      raw.portfolioCurrent,
      raw.portfolioTarget
    ),
    requiredCagr,
    actualCagr,
    estimatedCompletion: formatGoalDate(estimatedCompletion),
    targetDate: raw.portfolioTargetDate,
  };
}

export function buildPassiveIncomeGoalMetrics(
  raw: GoalsRawInput,
  assumedYieldPct: number = raw.assumedYieldPct
): PassiveIncomeGoalMetrics {
  const requiredPortfolioSize = calculateRequiredPortfolioSize(
    raw.passiveIncomeTarget,
    assumedYieldPct
  );

  const estimatedCompletion = estimateCompletionDate(
    raw.portfolioCurrent,
    requiredPortfolioSize,
    buildPortfolioGoalMetrics(raw).actualCagr,
    raw.averageMonthlyContribution,
    getGoalsReferenceDate(raw)
  );

  return {
    targetMonthly: raw.passiveIncomeTarget,
    currentMonthly: raw.passiveIncomeCurrent,
    progressPercent: calculateProgressPercent(
      raw.passiveIncomeCurrent,
      raw.passiveIncomeTarget
    ),
    estimatedCompletion: formatGoalDate(estimatedCompletion),
    requiredPortfolioSize,
    assumedYieldPct,
  };
}

export function buildTimelineProjection(
  raw: GoalsRawInput,
  assumedYieldPct: number,
  months = 36
): TimelinePoint[] {
  const baseDate = getGoalsReferenceDate(raw);
  const cagr = calculateAnnualizedReturn(
    raw.portfolioCurrent,
    raw.netContributions,
    raw.inceptionDate,
    raw.asOfDate
  );
  const points: TimelinePoint[] = [];

  for (let m = 0; m <= months; m++) {
    const portfolioValue = projectPortfolioValue(
      raw.portfolioCurrent,
      m,
      raw.averageMonthlyContribution,
      cagr
    );
    const passiveIncome = calculatePassiveIncomeFromPortfolio(
      portfolioValue,
      assumedYieldPct
    );
    const date = addMonths(baseDate, m);

    points.push({
      label: formatMonthYearLabel(date),
      portfolioValue: Math.round(portfolioValue),
      passiveIncome: Math.round(passiveIncome),
      portfolioTarget: raw.portfolioTarget,
      incomeTarget: raw.passiveIncomeTarget,
    });
  }

  return points;
}

export function buildGoalsDashboardData(
  raw: GoalsRawInput,
  dataSource: "supabase" | "mock",
  assumedYieldPct?: number
): GoalsDashboardData {
  const yieldPct = assumedYieldPct ?? raw.assumedYieldPct;
  const portfolioGoal = buildPortfolioGoalMetrics(raw);
  const passiveIncomeGoal = buildPassiveIncomeGoalMetrics(raw, yieldPct);

  const referenceYear = raw.asOfDate
    ? Number(raw.asOfDate.slice(0, 4))
    : new Date().getFullYear();
  const ytdContributions = raw.monthlyContributions
    .filter((c) => c.year === referenceYear)
    .reduce((sum, c) => sum + c.totalAmountSgd, 0);

  const ytdContributionBreakdown = calculateYtdBreakdown(
    raw.monthlyContributions.map((c) => ({
      id: c.id,
      contributionMonth: c.month,
      contributionYear: c.year,
      stockOptionsAmountSgd: c.stockOptionsAmountSgd,
      cryptoAmountSgd: c.cryptoAmountSgd,
      totalAmountSgd: c.totalAmountSgd,
      notes: c.notes,
      createdAt: "",
      updatedAt: "",
    })),
    referenceYear
  );

  return {
    portfolioGoal,
    passiveIncomeGoal,
    portfolioProgress: {
      label: "Portfolio Goal",
      current: raw.portfolioCurrent,
      target: raw.portfolioTarget,
      progressPercent: portfolioGoal.progressPercent,
      estimatedCompletion: portfolioGoal.estimatedCompletion,
    },
    passiveProgress: {
      label: "Passive Income Goal",
      current: raw.passiveIncomeCurrent,
      target: raw.passiveIncomeTarget,
      progressPercent: passiveIncomeGoal.progressPercent,
      estimatedCompletion: passiveIncomeGoal.estimatedCompletion,
    },
    timeline: buildTimelineProjection(raw, yieldPct),
    monthlyContributions: raw.monthlyContributions,
    ytdContributions,
    ytdContributionBreakdown,
    dataSource,
    raw: { ...raw, assumedYieldPct: yieldPct },
    passiveIncomeBreakdown: raw.passiveIncomeBreakdown,
    managedGoals: [],
    changeHistory: [],
  };
}
