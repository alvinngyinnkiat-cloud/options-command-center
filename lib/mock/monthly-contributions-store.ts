import type { MonthlyContribution as MonthlyContributionRow } from "@/types/database";
import { MOCK_MONTHLY_CONTRIBUTION_ROWS } from "./monthly-contributions";

let mockContributions: MonthlyContributionRow[] = [
  ...MOCK_MONTHLY_CONTRIBUTION_ROWS,
];

export function getMockMonthlyContributions(): MonthlyContributionRow[] {
  return [...mockContributions];
}

export function upsertMockMonthlyContribution(
  row: MonthlyContributionRow
): MonthlyContributionRow {
  const byId = mockContributions.findIndex((c) => c.id === row.id);
  if (byId >= 0) {
    mockContributions[byId] = {
      ...row,
      created_at: mockContributions[byId].created_at,
      updated_at: new Date().toISOString(),
    };
    return mockContributions[byId];
  }

  const byMonth = mockContributions.findIndex(
    (c) =>
      c.user_id === row.user_id &&
      c.contribution_year === row.contribution_year &&
      c.contribution_month === row.contribution_month
  );
  if (byMonth >= 0) {
    mockContributions[byMonth] = {
      ...row,
      id: mockContributions[byMonth].id,
      created_at: mockContributions[byMonth].created_at,
      updated_at: new Date().toISOString(),
    };
    return mockContributions[byMonth];
  }

  mockContributions.push(row);
  return row;
}

export function deleteMockMonthlyContribution(id: string): boolean {
  const before = mockContributions.length;
  mockContributions = mockContributions.filter((c) => c.id !== id);
  return mockContributions.length < before;
}

export function resetMockMonthlyContributions(): void {
  mockContributions = [...MOCK_MONTHLY_CONTRIBUTION_ROWS];
}
