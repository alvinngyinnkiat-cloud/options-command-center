import type {
  FinancialGoal,
  FinancialGoalChange,
} from "@/types/database";

let mockGoals: FinancialGoal[] = [];
let mockChanges: FinancialGoalChange[] = [];

export function getMockFinancialGoals(userId: string): FinancialGoal[] {
  return mockGoals.filter((g) => g.user_id === userId || userId === "mock-user");
}

export function upsertMockFinancialGoal(row: FinancialGoal): FinancialGoal {
  const idx = mockGoals.findIndex((g) => g.id === row.id);
  const saved = {
    ...row,
    updated_at: new Date().toISOString(),
  };
  if (idx >= 0) {
    mockGoals[idx] = {
      ...saved,
      created_at: mockGoals[idx].created_at,
    };
    return mockGoals[idx];
  }
  mockGoals.push(saved);
  return saved;
}

export function deleteMockFinancialGoal(id: string): boolean {
  const before = mockGoals.length;
  mockGoals = mockGoals.filter((g) => g.id !== id);
  mockChanges = mockChanges.filter((c) => c.goal_id !== id);
  return mockGoals.length < before;
}

export function appendMockGoalChange(
  change: FinancialGoalChange
): FinancialGoalChange {
  mockChanges.unshift(change);
  return change;
}

export function getMockGoalChanges(userId: string): FinancialGoalChange[] {
  return mockChanges.filter(
    (c) => c.user_id === userId || userId === "mock-user"
  );
}

export function resetMockFinancialGoals(): void {
  mockGoals = [];
  mockChanges = [];
}

export function ensureMockGoalsSeeded(_userId: string): FinancialGoal[] {
  return [];
}
