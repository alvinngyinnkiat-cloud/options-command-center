import { DEFAULT_GOAL_SEEDS } from "@/lib/goals/goal-models";
import { MOCK_REFERENCE_DATE } from "@/lib/mock/reference-dates";
import type {
  FinancialGoal,
  FinancialGoalChange,
} from "@/types/database";
import { randomUUID } from "crypto";

function seedGoals(userId: string): FinancialGoal[] {
  const now = new Date().toISOString();
  return DEFAULT_GOAL_SEEDS.map((seed) => ({
    id: randomUUID(),
    user_id: userId,
    name: seed.name,
    goal_type: seed.goalType,
    target_amount: seed.targetAmount,
    current_amount: 0,
    target_date: seed.targetDate,
    start_date: seed.startDate,
    is_active: true,
    is_archived: false,
    assumed_yield_pct: seed.assumedYieldPct ?? null,
    notes: seed.notes,
    created_at: now,
    updated_at: now,
  }));
}

let mockGoals: FinancialGoal[] = seedGoals("mock-user");
let mockChanges: FinancialGoalChange[] = [];

export function getMockFinancialGoals(userId: string): FinancialGoal[] {
  if (mockGoals.length === 0) {
    mockGoals = seedGoals(userId);
  }
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
  mockGoals = seedGoals("mock-user");
  mockChanges = [];
}

export function ensureMockGoalsSeeded(userId: string): FinancialGoal[] {
  const existing = mockGoals.filter(
    (g) => g.user_id === userId && g.is_active
  );
  if (existing.length === 0) {
    const seeded = seedGoals(userId);
    mockGoals.push(...seeded);
    return seeded;
  }
  return existing;
}
