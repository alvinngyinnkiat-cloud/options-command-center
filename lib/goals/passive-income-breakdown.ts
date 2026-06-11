import type { DividendPortfolioSummary } from "@/lib/dividends/types";

export interface PassiveIncomeBreakdown {
  monthlySgd: number;
  annualTotalSgd: number;
  usDividendSgd: number;
  sgDividendSgd: number;
}

export const PASSIVE_INCOME_SOURCE_LINE =
  "Based on actual dividend income only.";

export const EMPTY_PASSIVE_INCOME_BREAKDOWN: PassiveIncomeBreakdown = {
  monthlySgd: 0,
  annualTotalSgd: 0,
  usDividendSgd: 0,
  sgDividendSgd: 0,
};

export function computePassiveIncomeFromDividendSummary(
  summary: Pick<
    DividendPortfolioSummary,
    "annualDividendSgd" | "usDividendSgdYtd" | "sgDividendSgdYtd"
  >
): PassiveIncomeBreakdown {
  const annualTotalSgd = summary.annualDividendSgd;
  return {
    monthlySgd: annualTotalSgd / 12,
    annualTotalSgd,
    usDividendSgd: summary.usDividendSgdYtd,
    sgDividendSgd: summary.sgDividendSgdYtd,
  };
}

export function computePassiveIncomeMonthlySgd(
  summary: Pick<
    DividendPortfolioSummary,
    "annualDividendSgd" | "usDividendSgdYtd" | "sgDividendSgdYtd"
  >
): number {
  return computePassiveIncomeFromDividendSummary(summary).monthlySgd;
}

export function formatPassiveIncomeCalculationSource(
  _breakdown: PassiveIncomeBreakdown
): string {
  return PASSIVE_INCOME_SOURCE_LINE;
}
