import type { GoalsRawInput } from "@/lib/goals/types";
import {
  DEFAULT_ASSUMED_YIELD_PCT,
  DEFAULT_PASSIVE_INCOME_TARGET_SGD,
  DEFAULT_PORTFOLIO_TARGET_SGD,
} from "@/lib/goals/types";
import { MOCK_REFERENCE_DATE } from "@/lib/mock/reference-dates";
import { EMPTY_PASSIVE_INCOME_BREAKDOWN } from "@/lib/goals/passive-income-breakdown";

export const MOCK_GOALS_RAW: GoalsRawInput = {
  portfolioTarget: DEFAULT_PORTFOLIO_TARGET_SGD,
  portfolioCurrent: 0,
  portfolioTargetDate: "2028-12-31",
  passiveIncomeTarget: DEFAULT_PASSIVE_INCOME_TARGET_SGD,
  passiveIncomeCurrent: 0,
  inceptionDate: MOCK_REFERENCE_DATE,
  asOfDate: MOCK_REFERENCE_DATE,
  netContributions: 0,
  assumedYieldPct: DEFAULT_ASSUMED_YIELD_PCT,
  averageMonthlyContribution: 0,
  monthlyContributions: [],
  passiveIncomeBreakdown: EMPTY_PASSIVE_INCOME_BREAKDOWN,
};
