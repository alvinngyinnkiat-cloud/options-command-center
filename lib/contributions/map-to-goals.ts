import { formatContributionMonthLabel } from "./calculations";
import type { MonthlyContributionRecord } from "./types";
import type { MonthlyContribution as GoalsMonthlyContribution } from "@/lib/goals/types";

export function mapContributionsToGoals(
  contributions: MonthlyContributionRecord[]
): GoalsMonthlyContribution[] {
  return contributions.map((c) => ({
    id: c.id,
    month: c.contributionMonth,
    year: c.contributionYear,
    monthLabel: formatContributionMonthLabel(
      c.contributionMonth,
      c.contributionYear
    ),
    stockOptionsAmountSgd: c.stockOptionsAmountSgd,
    cryptoAmountSgd: c.cryptoAmountSgd,
    totalAmountSgd: c.totalAmountSgd,
    notes: c.notes,
  }));
}
