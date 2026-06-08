"use server";

import { contributionRowFromForm } from "@/lib/contributions/map-contribution";
import type {
  MonthlyContributionActionResult,
  MonthlyContributionFormInput,
} from "@/lib/contributions/types";
import {
  getMonthlyContributionTrackerData,
  persistMonthlyContribution,
  removeMonthlyContribution,
} from "@/lib/supabase/queries/monthly-contributions";
import { requireUserId } from "@/lib/supabase/resolve-user";
import { revalidatePath } from "next/cache";

async function finish(): Promise<MonthlyContributionActionResult> {
  const data = await getMonthlyContributionTrackerData();
  revalidatePath("/");
  revalidatePath("/goals");
  return { success: true, data };
}

export async function createMonthlyContribution(
  input: MonthlyContributionFormInput
): Promise<MonthlyContributionActionResult> {
  try {
    const userId = await requireUserId();
    const row = contributionRowFromForm(input, userId);
    await persistMonthlyContribution(row, userId);
    return finish();
  } catch (e) {
    return {
      success: false,
      error: e instanceof Error ? e.message : "Failed to add contribution.",
    };
  }
}

export async function updateMonthlyContribution(
  id: string,
  input: MonthlyContributionFormInput,
  createdAt?: string
): Promise<MonthlyContributionActionResult> {
  try {
    const userId = await requireUserId();
    const row = contributionRowFromForm(input, userId, id, createdAt);
    await persistMonthlyContribution(row, userId);
    return finish();
  } catch (e) {
    return {
      success: false,
      error: e instanceof Error ? e.message : "Failed to update contribution.",
    };
  }
}

export async function deleteMonthlyContribution(
  id: string
): Promise<MonthlyContributionActionResult> {
  try {
    const userId = await requireUserId();
    await removeMonthlyContribution(id, userId);
    return finish();
  } catch (e) {
    return {
      success: false,
      error: e instanceof Error ? e.message : "Failed to delete contribution.",
    };
  }
}
