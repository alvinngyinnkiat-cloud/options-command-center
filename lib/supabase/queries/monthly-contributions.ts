import { buildMonthlyContributionTrackerData } from "@/lib/contributions/calculations";
import { mapContributionRow } from "@/lib/contributions/map-contribution";
import type { MonthlyContributionTrackerData } from "@/lib/contributions/types";
import { MOCK_REFERENCE_DATE } from "@/lib/mock/reference-dates";
import {
  deleteMockMonthlyContribution,
  getMockMonthlyContributions,
  upsertMockMonthlyContribution,
} from "@/lib/mock/monthly-contributions-store";
import { readSupabasePrimary } from "@/lib/supabase/data-access";
import { isSupabaseConfigured } from "@/lib/supabase/is-configured";
import { MOCK_USER_ID, warnMissingDevUserIdForWrite, withSupabaseQuery } from "@/lib/supabase/resolve-user";
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

async function fetchContributionRows(
  _userId: string
): Promise<MonthlyContributionRow[]> {
  return withSupabaseQuery(
    async ({ userId, supabase }) => {
      const { data, error } = await supabase
        .from("monthly_contributions")
        .select("*")
        .eq("user_id", userId)
        .order("contribution_year", { ascending: true })
        .order("contribution_month", { ascending: true });

      if (error) return [];
      return (data ?? []) as MonthlyContributionRow[];
    },
    () => []
  );
}

export async function getMonthlyContributionTrackerData(): Promise<MonthlyContributionTrackerData> {
  const { value, dataSource } = await readSupabasePrimary({
    module: "getMonthlyContributionTrackerData",
    mock: () => buildTrackerData([], "mock"),
    empty: () => buildTrackerData([], "supabase"),
    read: async (userId) =>
      buildTrackerData(await fetchContributionRows(userId), "supabase"),
  });
  return { ...value, dataSource };
}

export async function persistMonthlyContribution(
  row: MonthlyContributionRow,
  userId?: string
): Promise<MonthlyContributionRow> {
  if (!isSupabaseConfigured()) {
    return upsertMockMonthlyContribution({
      ...row,
      user_id: userId ?? MOCK_USER_ID,
    });
  }

  return withSupabaseQuery(
    async ({ userId: effectiveUserId, supabase }) => {
      const { data: existing } = await supabase
        .from("monthly_contributions")
        .select("id, created_at")
        .eq("user_id", effectiveUserId)
        .eq("contribution_year", row.contribution_year)
        .eq("contribution_month", row.contribution_month)
        .maybeSingle();

      const payload = {
        ...row,
        id: existing ? (existing as { id: string }).id : row.id,
        user_id: effectiveUserId,
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
    },
    () => {
      warnMissingDevUserIdForWrite();
      return upsertMockMonthlyContribution({ ...row, user_id: MOCK_USER_ID });
    }
  );
}

export async function removeMonthlyContribution(
  id: string,
  userId?: string
): Promise<void> {
  if (!isSupabaseConfigured()) {
    deleteMockMonthlyContribution(id);
    return;
  }

  await withSupabaseQuery(
    async ({ userId: effectiveUserId, supabase }) => {
      const { error } = await supabase
        .from("monthly_contributions")
        .delete()
        .eq("id", id)
        .eq("user_id", effectiveUserId);

      if (error) throw new Error(error.message);
    },
    () => {
      warnMissingDevUserIdForWrite();
      deleteMockMonthlyContribution(id);
    }
  );
}
