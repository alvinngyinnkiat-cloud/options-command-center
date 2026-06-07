import { buildMonthlyContributionTrackerData } from "@/lib/contributions/calculations";
import { mapContributionRow } from "@/lib/contributions/map-contribution";
import type { MonthlyContributionTrackerData } from "@/lib/contributions/types";
import { MOCK_REFERENCE_DATE } from "@/lib/mock/reference-dates";
import {
  deleteMockMonthlyContribution,
  getMockMonthlyContributions,
  upsertMockMonthlyContribution,
} from "@/lib/mock/monthly-contributions-store";
import { isSupabaseConfigured } from "@/lib/supabase/is-configured";
import { createClient } from "@/lib/supabase/server";
import type { MonthlyContribution as MonthlyContributionRow } from "@/types/database";

function getReferenceYear(): number {
  return Number(MOCK_REFERENCE_DATE.slice(0, 4));
}

function buildTrackerData(
  rows: MonthlyContributionRow[],
  dataSource: "supabase" | "mock",
  currentYear = getReferenceYear()
): MonthlyContributionTrackerData {
  const contributions = rows.map(mapContributionRow);
  return buildMonthlyContributionTrackerData(
    contributions,
    currentYear,
    dataSource
  );
}

export async function getMonthlyContributionTrackerData(): Promise<MonthlyContributionTrackerData> {
  if (!isSupabaseConfigured()) {
    return buildTrackerData(getMockMonthlyContributions(), "mock");
  }

  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return buildTrackerData(getMockMonthlyContributions(), "mock");
    }

    const { data, error } = await supabase
      .from("monthly_contributions")
      .select("*")
      .eq("user_id", user.id)
      .order("contribution_year", { ascending: true })
      .order("contribution_month", { ascending: true });

    if (error || !data?.length) {
      return buildTrackerData(getMockMonthlyContributions(), "mock");
    }

    return buildTrackerData(data as MonthlyContributionRow[], "supabase");
  } catch {
    return buildTrackerData(getMockMonthlyContributions(), "mock");
  }
}

export async function persistMonthlyContribution(
  row: MonthlyContributionRow,
  userId?: string
): Promise<MonthlyContributionRow> {
  if (!isSupabaseConfigured() || !userId) {
    return upsertMockMonthlyContribution({
      ...row,
      user_id: userId ?? "mock-user",
    });
  }

  const supabase = await createClient();
  const { data: existing } = await supabase
    .from("monthly_contributions")
    .select("id, created_at")
    .eq("user_id", userId)
    .eq("contribution_year", row.contribution_year)
    .eq("contribution_month", row.contribution_month)
    .maybeSingle();

  const payload = {
    ...row,
    id: existing ? (existing as { id: string }).id : row.id,
    user_id: userId,
    created_at: existing
      ? (existing as { created_at: string }).created_at
      : row.created_at,
    updated_at: new Date().toISOString(),
  };

  const { data, error } = await supabase
    .from("monthly_contributions")
    .upsert(payload as never, {
      onConflict: "user_id,contribution_year,contribution_month",
    })
    .select()
    .single();

  if (error) throw new Error(error.message);
  return data as MonthlyContributionRow;
}

export async function removeMonthlyContribution(
  id: string,
  userId?: string
): Promise<void> {
  if (!isSupabaseConfigured() || !userId) {
    deleteMockMonthlyContribution(id);
    return;
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("monthly_contributions")
    .delete()
    .eq("id", id)
    .eq("user_id", userId);

  if (error) throw new Error(error.message);
}
