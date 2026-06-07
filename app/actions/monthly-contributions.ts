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
import { isSupabaseConfigured } from "@/lib/supabase/is-configured";
import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

async function finish(): Promise<MonthlyContributionActionResult> {
  const data = await getMonthlyContributionTrackerData();
  revalidatePath("/");
  revalidatePath("/goals");
  return { success: true, data };
}

async function resolveUserId(): Promise<string | undefined> {
  if (!isSupabaseConfigured()) return undefined;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user?.id;
}

export async function createMonthlyContribution(
  input: MonthlyContributionFormInput
): Promise<MonthlyContributionActionResult> {
  try {
    const userId = (await resolveUserId()) ?? "mock-user";
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
    const userId = (await resolveUserId()) ?? "mock-user";
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
    const userId = await resolveUserId();
    await removeMonthlyContribution(id, userId);
    return finish();
  } catch (e) {
    return {
      success: false,
      error: e instanceof Error ? e.message : "Failed to delete contribution.",
    };
  }
}
