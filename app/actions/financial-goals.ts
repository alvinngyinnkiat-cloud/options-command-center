"use server";

import type { FinancialGoalFormInput } from "@/lib/goals/goal-models";
import type { GoalsDashboardData } from "@/lib/goals/types";
import { getFinancialGoalsData } from "@/lib/supabase/queries/goals";
import {
  archiveFinancialGoalRecord,
  createFinancialGoalRecord,
  deleteFinancialGoalRecord,
  updateFinancialGoalRecord,
} from "@/lib/supabase/queries/financial-goals";
import { isSupabaseConfigured } from "@/lib/supabase/is-configured";
import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export type FinancialGoalActionResult =
  | { success: true; data: GoalsDashboardData }
  | { success: false; error: string };

async function finish(): Promise<FinancialGoalActionResult> {
  const data = await getFinancialGoalsData();
  revalidatePath("/goals");
  revalidatePath("/");
  return { success: true, data };
}

async function resolveUserId(): Promise<string> {
  if (!isSupabaseConfigured()) return "mock-user";
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user?.id ?? "mock-user";
}

export async function createFinancialGoal(
  input: FinancialGoalFormInput
): Promise<FinancialGoalActionResult> {
  try {
    const userId = await resolveUserId();
    if (!input.name.trim()) {
      return { success: false, error: "Goal name is required." };
    }
    if (!Number.isFinite(input.targetAmount) || input.targetAmount <= 0) {
      return { success: false, error: "Enter a valid target amount." };
    }
    await createFinancialGoalRecord(input, userId);
    return finish();
  } catch (e) {
    return {
      success: false,
      error: e instanceof Error ? e.message : "Failed to create goal.",
    };
  }
}

export async function updateFinancialGoal(
  id: string,
  input: FinancialGoalFormInput,
  changeReason?: string | null
): Promise<FinancialGoalActionResult> {
  try {
    const userId = await resolveUserId();
    if (!input.name.trim()) {
      return { success: false, error: "Goal name is required." };
    }
    await updateFinancialGoalRecord(id, input, userId, changeReason);
    return finish();
  } catch (e) {
    return {
      success: false,
      error: e instanceof Error ? e.message : "Failed to update goal.",
    };
  }
}

export async function archiveFinancialGoal(
  id: string,
  archived = true
): Promise<FinancialGoalActionResult> {
  try {
    const userId = await resolveUserId();
    await archiveFinancialGoalRecord(id, userId, archived);
    return finish();
  } catch (e) {
    return {
      success: false,
      error: e instanceof Error ? e.message : "Failed to archive goal.",
    };
  }
}

export async function deleteFinancialGoal(
  id: string
): Promise<FinancialGoalActionResult> {
  try {
    const userId = await resolveUserId();
    await deleteFinancialGoalRecord(id, userId);
    return finish();
  } catch (e) {
    return {
      success: false,
      error: e instanceof Error ? e.message : "Failed to delete goal.",
    };
  }
}
