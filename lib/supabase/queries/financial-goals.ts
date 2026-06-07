import { mapContributionsToGoals } from "@/lib/contributions/map-to-goals";
import {
  buildGoalLiveContext,
  buildManagedGoals,
} from "@/lib/goals/build-managed-goals";
import type {
  FinancialGoalFormInput,
  GoalChangeRecord,
} from "@/lib/goals/goal-models";
import { buildDividendPortfolioSummary } from "@/lib/dividends/calculations";
import { computePassiveIncomeMonthlySgd } from "@/lib/goals/resolve-current-value";
import {
  appendMockGoalChange,
  deleteMockFinancialGoal,
  ensureMockGoalsSeeded,
  getMockFinancialGoals,
  getMockGoalChanges,
  upsertMockFinancialGoal,
} from "@/lib/mock/financial-goals-store";
import { MOCK_GOALS_RAW } from "@/lib/mock/goals";
import { MOCK_REFERENCE_DATE } from "@/lib/mock/reference-dates";
import { getEnrichedPortfolioMetrics } from "@/lib/portfolio/enrich-capital-pools";
import { buildCategoryValuesSgd } from "@/lib/stocks-etfs/build-tab-data";
import {
  buildSgMarketData,
  buildUsMarketData,
} from "@/lib/ticker-positions/market-aggregate";
import { isSupabaseConfigured } from "@/lib/supabase/is-configured";
import { createClient } from "@/lib/supabase/server";
import { getLatestDailySnapshot } from "@/lib/supabase/queries/daily-portfolio-snapshots";
import { listDividendRecordRows } from "@/lib/supabase/queries/dividend-records";
import { getMonthlyContributionTrackerData } from "@/lib/supabase/queries/monthly-contributions";
import { getOptionsTradesData } from "@/lib/supabase/queries/options-trades";
import { getStockEtfTrackerData } from "@/lib/supabase/queries/stock-etf-holdings";
import type {
  FinancialGoal,
  FinancialGoalChange,
} from "@/types/database";
import { randomUUID } from "crypto";

const TRACKED_FIELDS = [
  "target_amount",
  "target_date",
  "name",
  "notes",
] as const;

function mapChangeRow(row: FinancialGoalChange): GoalChangeRecord {
  return {
    id: row.id,
    goalId: row.goal_id,
    goalName: row.goal_name,
    fieldName: row.field_name,
    previousValue: row.previous_value,
    newValue: row.new_value,
    changeReason: row.change_reason,
    createdAt: row.created_at,
  };
}

function goalFromForm(
  input: FinancialGoalFormInput,
  userId: string,
  id?: string,
  existing?: FinancialGoal
): FinancialGoal {
  const now = new Date().toISOString();
  return {
    id: id ?? randomUUID(),
    user_id: userId,
    name: input.name.trim(),
    goal_type: input.goalType,
    target_amount: input.targetAmount,
    current_amount:
      input.goalType === "net_worth" || input.goalType === "income"
        ? 0
        : (input.currentAmount ?? existing?.current_amount ?? 0),
    target_date: input.targetDate,
    start_date: input.startDate,
    is_active: existing?.is_active ?? true,
    is_archived: existing?.is_archived ?? false,
    assumed_yield_pct: input.assumedYieldPct ?? null,
    notes: input.notes,
    created_at: existing?.created_at ?? now,
    updated_at: now,
  };
}

async function resolveLiveMetrics(userId: string): Promise<{
  portfolioCurrentSgd: number;
  passiveIncomeMonthlySgd: number;
  asOfDate: string;
  netContributions: number;
  averageMonthlyContribution: number;
  inceptionDate: string;
}> {
  const [enriched, contributionTracker, latestSnapshot, tradesData, stockData, dividendRows] =
    await Promise.all([
      getEnrichedPortfolioMetrics(),
      getMonthlyContributionTrackerData(),
      getLatestDailySnapshot(userId),
      getOptionsTradesData(),
      getStockEtfTrackerData(),
      listDividendRecordRows(userId),
    ]);

  const referenceDate = MOCK_REFERENCE_DATE;
  const dividendSummary = buildDividendPortfolioSummary(
    dividendRows,
    referenceDate,
    Number(referenceDate.slice(0, 4))
  );

  const { metrics, capitalPools } = enriched;
  const portfolioCurrentSgd =
    latestSnapshot?.portfolioValueSgd ?? capitalPools.myPortfolioValue;

  const usMarket = buildUsMarketData(
    stockData.holdings,
    tradesData.trades,
    dividendSummary.byTicker
  );
  const sgMarket = buildSgMarketData(
    stockData.holdings,
    dividendSummary.byTicker
  );

  const passiveIncomeMonthlySgd = computePassiveIncomeMonthlySgd(
    usMarket.summary,
    sgMarket.summary
  );

  const asOfDate =
    latestSnapshot?.snapshotDate ??
    MOCK_GOALS_RAW.asOfDate ??
    MOCK_REFERENCE_DATE;

  const goals = await listFinancialGoalRows(userId);
  const portfolioGoal = goals.find((g) => g.goal_type === "net_worth");
  const inceptionDate =
    portfolioGoal?.start_date ??
    goals.find((g) => g.start_date)?.start_date ??
    MOCK_GOALS_RAW.inceptionDate;

  return {
    portfolioCurrentSgd,
    passiveIncomeMonthlySgd,
    asOfDate,
    netContributions:
      metrics.dataSource === "supabase"
        ? metrics.netContributions
        : MOCK_GOALS_RAW.netContributions,
    averageMonthlyContribution: contributionTracker.averageMonthlyContribution,
    inceptionDate,
  };
}

async function seedDefaultGoals(userId: string): Promise<void> {
  const { DEFAULT_GOAL_SEEDS } = await import("@/lib/goals/goal-models");
  const now = new Date().toISOString();
  for (const seed of DEFAULT_GOAL_SEEDS) {
    const row: FinancialGoal = {
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
    };
    await persistFinancialGoalRow(row, userId);
  }
}

async function persistFinancialGoalRow(
  row: FinancialGoal,
  userId: string
): Promise<FinancialGoal> {
  if (!isSupabaseConfigured()) {
    return upsertMockFinancialGoal({ ...row, user_id: userId });
  }

  const supabase = await createClient();
  const payload = { ...row, user_id: userId, updated_at: new Date().toISOString() };
  const { data, error } = await supabase
    .from("financial_goals")
    .upsert(payload as never)
    .select()
    .single();

  if (error) throw new Error(error.message);
  return data as FinancialGoal;
}

async function logGoalChanges(
  previous: FinancialGoal,
  next: FinancialGoal,
  userId: string,
  reason?: string | null
): Promise<void> {
  for (const field of TRACKED_FIELDS) {
    const prev = String(previous[field] ?? "");
    const neu = String(next[field] ?? "");
    if (prev === neu) continue;

    const change: FinancialGoalChange = {
      id: randomUUID(),
      user_id: userId,
      goal_id: next.id,
      goal_name: next.name,
      field_name: field,
      previous_value: prev || null,
      new_value: neu || null,
      change_reason: reason ?? null,
      created_at: new Date().toISOString(),
    };

    if (!isSupabaseConfigured()) {
      appendMockGoalChange(change);
      continue;
    }

    const supabase = await createClient();
    const { id: _id, ...insertPayload } = change;
    await supabase.from("financial_goal_changes").insert(insertPayload as never);
  }
}

function normalizeGoalRow(row: FinancialGoal): FinancialGoal {
  return {
    ...row,
    start_date: row.start_date ?? null,
    is_archived: row.is_archived ?? false,
    assumed_yield_pct: row.assumed_yield_pct ?? null,
  };
}

export async function listFinancialGoalRows(
  userId: string
): Promise<FinancialGoal[]> {
  if (!isSupabaseConfigured()) {
    ensureMockGoalsSeeded(userId);
    return getMockFinancialGoals(userId)
      .filter((g) => g.is_active)
      .map(normalizeGoalRow);
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("financial_goals")
    .select("*")
    .eq("user_id", userId)
    .eq("is_active", true)
    .order("created_at", { ascending: true });

  if (error) throw new Error(error.message);

  if (!data?.length) {
    await seedDefaultGoals(userId);
    const { data: seeded } = await supabase
      .from("financial_goals")
      .select("*")
      .eq("user_id", userId)
      .eq("is_active", true)
      .order("created_at", { ascending: true });
    return (seeded ?? []).map((r) => normalizeGoalRow(r as FinancialGoal));
  }

  return (data as FinancialGoal[]).map(normalizeGoalRow);
}

export async function getFinancialGoalsManagementData(userId: string) {
  const live = await resolveLiveMetrics(userId);
  const rows = await listFinancialGoalRows(userId);
  const ctx = buildGoalLiveContext(live);
  const goals = buildManagedGoals(rows, ctx);

  const changes = await getGoalChangeHistory(userId);

  return { goals, changeHistory: changes, liveContext: ctx };
}

export async function getGoalChangeHistory(
  userId: string
): Promise<GoalChangeRecord[]> {
  if (!isSupabaseConfigured()) {
    return getMockGoalChanges(userId).map(mapChangeRow);
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("financial_goal_changes")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(50);

  if (error || !data) return [];
  return (data as FinancialGoalChange[]).map(mapChangeRow);
}

export async function createFinancialGoalRecord(
  input: FinancialGoalFormInput,
  userId: string
): Promise<FinancialGoal> {
  const row = goalFromForm(input, userId);
  return persistFinancialGoalRow(row, userId);
}

export async function updateFinancialGoalRecord(
  id: string,
  input: FinancialGoalFormInput,
  userId: string,
  changeReason?: string | null
): Promise<FinancialGoal> {
  const rows = await listFinancialGoalRows(userId);
  const existing = rows.find((g) => g.id === id);
  if (!existing) throw new Error("Goal not found.");

  const next = goalFromForm(input, userId, id, existing);
  await logGoalChanges(existing, next, userId, changeReason);
  return persistFinancialGoalRow(next, userId);
}

export async function archiveFinancialGoalRecord(
  id: string,
  userId: string,
  archived: boolean
): Promise<FinancialGoal> {
  const rows = await listFinancialGoalRows(userId);
  const existing = rows.find((g) => g.id === id);
  if (!existing) throw new Error("Goal not found.");

  const next = {
    ...existing,
    is_archived: archived,
    updated_at: new Date().toISOString(),
  };
  return persistFinancialGoalRow(next, userId);
}

export async function deleteFinancialGoalRecord(
  id: string,
  userId: string
): Promise<void> {
  if (!isSupabaseConfigured()) {
    deleteMockFinancialGoal(id);
    return;
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("financial_goals")
    .delete()
    .eq("id", id)
    .eq("user_id", userId);

  if (error) throw new Error(error.message);
}

export function financialGoalToFormInput(goal: FinancialGoal): FinancialGoalFormInput {
  return {
    name: goal.name,
    goalType: goal.goal_type,
    targetAmount: Number(goal.target_amount),
    currentAmount: Number(goal.current_amount),
    targetDate: goal.target_date,
    startDate: goal.start_date,
    notes: goal.notes,
    assumedYieldPct:
      goal.assumed_yield_pct != null ? Number(goal.assumed_yield_pct) : null,
  };
}
