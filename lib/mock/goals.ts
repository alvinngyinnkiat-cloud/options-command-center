import type { GoalsRawInput } from "@/lib/goals/types";
import {
  DEFAULT_ASSUMED_YIELD_PCT,
  DEFAULT_PASSIVE_INCOME_TARGET_SGD,
  DEFAULT_PORTFOLIO_TARGET_SGD,
} from "@/lib/goals/types";
import { mapContributionsToGoals } from "@/lib/contributions/map-to-goals";
import { buildMonthlyContributionTrackerData } from "@/lib/contributions/calculations";
import { mapContributionRow } from "@/lib/contributions/map-contribution";
import { MOCK_REFERENCE_DATE } from "@/lib/mock/reference-dates";
import { EMPTY_PASSIVE_INCOME_BREAKDOWN } from "@/lib/goals/passive-income-breakdown";
import { MOCK_MONTHLY_CONTRIBUTION_ROWS } from "@/lib/mock/monthly-contributions";

const mockTracker = buildMonthlyContributionTrackerData(
  MOCK_MONTHLY_CONTRIBUTION_ROWS.map(mapContributionRow),
  Number(MOCK_REFERENCE_DATE.slice(0, 4)),
  "mock"
);

export const MOCK_GOALS_RAW: GoalsRawInput = {
  portfolioTarget: DEFAULT_PORTFOLIO_TARGET_SGD,
  portfolioCurrent: 68_420,
  portfolioTargetDate: "2028-12-31",
  passiveIncomeTarget: DEFAULT_PASSIVE_INCOME_TARGET_SGD,
  passiveIncomeCurrent: 0,
  inceptionDate: "2024-01-15",
  asOfDate: MOCK_REFERENCE_DATE,
  netContributions: 52_000,
  assumedYieldPct: DEFAULT_ASSUMED_YIELD_PCT,
  averageMonthlyContribution: mockTracker.averageMonthlyContribution,
  monthlyContributions: mapContributionsToGoals(mockTracker.contributions),
  passiveIncomeBreakdown: EMPTY_PASSIVE_INCOME_BREAKDOWN,
};
