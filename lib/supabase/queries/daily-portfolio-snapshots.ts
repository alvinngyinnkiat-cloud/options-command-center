import { buildPortfolioCapitalPools } from "@/lib/portfolio/enrich-capital-pools";
import type { CapitalPoolsBreakdown } from "@/lib/portfolio/capital-pools";
import { MOCK_REFERENCE_DATE } from "@/lib/mock/reference-dates";
import {
  buildHistoryComparisons,
  buildMilestones,
  buildPerformanceMetrics,
  filterRealPortfolioSnapshots,
  selectLatestSnapshot,
} from "@/lib/portfolio/snapshot-history";
import { getSingaporeSnapshotDate } from "@/lib/portfolio/snapshot-date";
import type { PortfolioHistoryData } from "@/lib/portfolio/daily-snapshot-types";
import {
  buildDailySnapshotPayload,
  mapDailySnapshotRow,
} from "@/lib/portfolio/daily-snapshot";
import type { PortfolioMetrics } from "@/lib/portfolio/types";
import { buildPortfolioPnlBreakdown } from "@/lib/trades/pnl-allocation";
import { buildTradeTrackerSummary } from "@/lib/trades/summary";
import type { EnrichedTrade } from "@/lib/trades/types";
import {
  getMockDailyPortfolioSnapshots,
  setMockDailyPortfolioSnapshots,
  upsertMockDailyPortfolioSnapshot,
  deleteMockDailyPortfolioSnapshot,
  updateMockDailyPortfolioSnapshot,
} from "@/lib/mock/daily-portfolio-snapshots-store";
import { isSupabaseConfigured } from "@/lib/supabase/is-configured";
import {
  MOCK_USER_ID,
  isSupabaseRlsError,
  isValidSupabaseUserId,
  resolveSupabaseReadUserId,
  resolveSupabaseServerAccess,
  resolveSupabaseWriteUserId,
  warnMissingDevUserIdForWrite,
} from "@/lib/supabase/resolve-user";
import { getServerSupabaseClient } from "@/lib/supabase/server-write";
import { calculateAllTimeContributions } from "@/lib/contributions/calculations";
import { mapContributionRow } from "@/lib/contributions/map-contribution";
import type { SupabaseClient } from "@supabase/supabase-js";
import type {
  DailyPortfolioSnapshot as DailyPortfolioSnapshotRow,
  DailyPortfolioSnapshotWrite,
  Database,
  MonthlyContribution,
} from "@/types/database";

type AdminClient = SupabaseClient<Database>;

async function fetchTotalContributionsSgd(
  userId: string,
  supabase?: AdminClient | Awaited<ReturnType<typeof getServerSupabaseClient>>
): Promise<number> {
  if (!isSupabaseConfigured()) {
    const { getMockMonthlyContributions } = await import(
      "@/lib/mock/monthly-contributions-store"
    );
    return calculateAllTimeContributions(
      getMockMonthlyContributions().map(mapContributionRow)
    );
  }

  if (!supabase) return 0;

  const { data, error } = await supabase
    .from("monthly_contributions")
    .select("*")
    .eq("user_id", userId);

  if (error) return 0;
  return calculateAllTimeContributions(
    ((data ?? []) as MonthlyContribution[]).map(mapContributionRow)
  );
}

export interface DailyPortfolioRecordFormInput {
  snapshotDate: string;
  portfolioValueSgd: number;
  clientCurrentValueSgd: number;
  tradingCashUsd: number;
  tradingCashSgd: number;
  cryptoCashSgd: number;
  cryptoValueSgd: number;
  notes: string | null;
}

function resolveHistoryAsOfDate(explicit?: string): string {
  if (explicit) return explicit;
  return isSupabaseConfigured()
    ? getSingaporeSnapshotDate()
    : MOCK_REFERENCE_DATE;
}

function buildHistoryData(
  snapshots: ReturnType<typeof mapDailySnapshotRow>[],
  dataSource: "supabase" | "mock",
  asOfDate: string
): PortfolioHistoryData {
  const realSnapshots = filterRealPortfolioSnapshots(snapshots);
  const latest = selectLatestSnapshot(realSnapshots, asOfDate);
  return {
    snapshots: realSnapshots,
    latest,
    comparisons: buildHistoryComparisons(realSnapshots, asOfDate),
    performance: buildPerformanceMetrics(realSnapshots, asOfDate),
    milestones: buildMilestones(realSnapshots, asOfDate),
    dataSource,
  };
}

function mockSystemSnapshot(
  userId: string,
  payload: ReturnType<typeof buildDailySnapshotPayload>,
  existingCreatedAt?: string
): DailyPortfolioSnapshotRow {
  return upsertMockDailyPortfolioSnapshot({
    id: crypto.randomUUID(),
    user_id: userId,
    ...payload,
    is_manual_entry: false,
    entered_by: "system",
    created_at: existingCreatedAt ?? new Date().toISOString(),
    updated_at: new Date().toISOString(),
  });
}

export async function upsertDailyPortfolioSnapshot(input: {
  userId: string;
  metrics: PortfolioMetrics;
  trades: EnrichedTrade[];
  snapshotDate?: string;
  capitalPools?: CapitalPoolsBreakdown;
  /** When true, overwrite an existing manual snapshot for the same date. */
  allowManualOverwrite?: boolean;
}): Promise<DailyPortfolioSnapshotRow> {
  const summary = buildTradeTrackerSummary(input.trades);
  const pnl = buildPortfolioPnlBreakdown(input.trades);
  const capitalPools =
    input.capitalPools ?? (await buildPortfolioCapitalPools(input.metrics));

  if (!isSupabaseConfigured()) {
    const totalContributionsSgd = await fetchTotalContributionsSgd(input.userId);
    const payload = buildDailySnapshotPayload({
      metrics: input.metrics,
      openRisk: summary.totalOpenRisk,
      pnl,
      snapshotDate: input.snapshotDate,
      capitalPools,
      totalContributionsSgd,
    });

    const today = getSingaporeSnapshotDate();
    if (payload.snapshot_date !== today) {
      throw new Error(
        "Snapshots can only be created or updated for today (Singapore date)."
      );
    }

    return upsertMockDailyPortfolioSnapshot({
      id: crypto.randomUUID(),
      user_id: input.userId === MOCK_USER_ID ? MOCK_USER_ID : input.userId,
      ...payload,
      is_manual_entry: false,
      entered_by: "system",
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });
  }

  const access = await resolveSupabaseServerAccess();
  if (!access) {
    warnMissingDevUserIdForWrite();
    const totalContributionsSgd = await fetchTotalContributionsSgd(input.userId);
    const payload = buildDailySnapshotPayload({
      metrics: input.metrics,
      openRisk: summary.totalOpenRisk,
      pnl,
      snapshotDate: input.snapshotDate,
      capitalPools,
      totalContributionsSgd,
    });
    return mockSystemSnapshot(MOCK_USER_ID, payload);
  }

  const supabase = await getServerSupabaseClient(access);
  const totalContributionsSgd = await fetchTotalContributionsSgd(
    access.userId,
    supabase
  );
  const payload = buildDailySnapshotPayload({
    metrics: input.metrics,
    openRisk: summary.totalOpenRisk,
    pnl,
    snapshotDate: input.snapshotDate,
    capitalPools,
    totalContributionsSgd,
  });

  const today = getSingaporeSnapshotDate();
  if (payload.snapshot_date !== today) {
    throw new Error(
      "Snapshots can only be created or updated for today (Singapore date)."
    );
  }

  const effectiveUserId = access.userId;

  const { data: existing } = await supabase
    .from("daily_portfolio_snapshots")
    .select("id, created_at, notes, is_manual_entry")
    .eq("user_id", effectiveUserId)
    .eq("snapshot_date", payload.snapshot_date)
    .maybeSingle();

  const existingRow = existing as {
    id: string;
    created_at: string;
    notes: string | null;
    is_manual_entry: boolean;
  } | null;

  if (existingRow?.is_manual_entry && !input.allowManualOverwrite) {
    const { data: manualRow, error: fetchError } = await supabase
      .from("daily_portfolio_snapshots")
      .select("*")
      .eq("id", existingRow.id)
      .single();
    if (fetchError) throw new Error(fetchError.message);
    return manualRow as DailyPortfolioSnapshotRow;
  }

  const rpcPayload = {
    id: existingRow?.id ?? crypto.randomUUID(),
    user_id: effectiveUserId,
    ...payload,
    notes: existingRow?.notes ?? payload.notes ?? null,
    created_at: existingRow?.created_at ?? new Date().toISOString(),
  };

  if (access.mode === "dev-service-role") {
    const writable: DailyPortfolioSnapshotWrite = {
      ...rpcPayload,
      is_manual_entry: false,
      entered_by: "system",
      updated_at: new Date().toISOString(),
    };

    const { data, error } = await supabase
      .from("daily_portfolio_snapshots")
      .upsert(writable as never, { onConflict: "user_id,snapshot_date" })
      .select("*")
      .single();

    if (error) throw new Error(error.message);
    return data as DailyPortfolioSnapshotRow;
  }

  const { data, error } = await supabase.rpc(
    "upsert_system_daily_portfolio_snapshot",
    { p_payload: rpcPayload } as never
  );

  if (error) {
    if (isSupabaseRlsError(error.message)) {
      warnMissingDevUserIdForWrite();
      return mockSystemSnapshot(MOCK_USER_ID, payload, existingRow?.created_at);
    }
    throw new Error(error.message);
  }

  return data as DailyPortfolioSnapshotRow;
}

async function fetchDailySnapshotsFromDb(
  userId: string
): Promise<DailyPortfolioSnapshotRow[]> {
  if (!isValidSupabaseUserId(userId)) {
    return [];
  }

  const access = await resolveSupabaseServerAccess();
  if (!access || access.userId !== userId) {
    return [];
  }

  const supabase = await getServerSupabaseClient(access);
  const { data, error } = await supabase
    .from("daily_portfolio_snapshots")
    .select("*")
    .eq("user_id", userId)
    .order("snapshot_date", { ascending: true });

  if (error) return [];
  return (data ?? []) as DailyPortfolioSnapshotRow[];
}

export async function getLatestDailySnapshotValue(
  userId?: string
): Promise<number | null> {
  if (!isSupabaseConfigured() || !userId || !isValidSupabaseUserId(userId)) {
    const rows = getMockDailyPortfolioSnapshots();
    const asOfDate = MOCK_REFERENCE_DATE;
    const latest = selectLatestSnapshot(rows.map(mapDailySnapshotRow), asOfDate);
    return latest ? latest.portfolioValueSgd : null;
  }

  const access = await resolveSupabaseServerAccess();
  if (!access || access.userId !== userId) {
    return null;
  }

  const supabase = await getServerSupabaseClient(access);
  const today = getSingaporeSnapshotDate();
  const { data } = await supabase
    .from("daily_portfolio_snapshots")
    .select("portfolio_value_sgd")
    .eq("user_id", userId)
    .lte("snapshot_date", today)
    .order("snapshot_date", { ascending: false })
    .limit(1)
    .maybeSingle();

  return data ? Number((data as { portfolio_value_sgd: number }).portfolio_value_sgd) : null;
}

export async function ensureDailyPortfolioSnapshot(input: {
  userId: string;
  metrics: PortfolioMetrics;
  trades: EnrichedTrade[];
  capitalPools?: CapitalPoolsBreakdown;
  asOfDate?: string;
}): Promise<void> {
  const date =
    input.asOfDate ??
    (isSupabaseConfigured()
      ? getSingaporeSnapshotDate()
      : MOCK_REFERENCE_DATE);
  await upsertDailyPortfolioSnapshot({
    userId: input.userId,
    metrics: input.metrics,
    trades: input.trades,
    capitalPools: input.capitalPools,
    snapshotDate: date,
  });
}

export async function getPortfolioHistoryData(input: {
  userId: string;
  metrics: PortfolioMetrics;
  trades: EnrichedTrade[];
  capitalPools?: CapitalPoolsBreakdown;
  asOfDate?: string;
}): Promise<PortfolioHistoryData> {
  const asOfDate = resolveHistoryAsOfDate(input.asOfDate);
  const capitalPools =
    input.capitalPools ?? (await buildPortfolioCapitalPools(input.metrics));

  if (!isSupabaseConfigured()) {
    const rows = getMockDailyPortfolioSnapshots();
    return buildHistoryData(
      rows.map(mapDailySnapshotRow),
      "mock",
      asOfDate
    );
  }

  const readUserId = await resolveSupabaseReadUserId(input.userId);
  const rows = readUserId
    ? await fetchDailySnapshotsFromDb(readUserId)
    : [];
  const snapshots = rows.map(mapDailySnapshotRow);
  return buildHistoryData(snapshots, "supabase", asOfDate);
}

export async function listDailyPortfolioSnapshots(
  userId: string
): Promise<ReturnType<typeof mapDailySnapshotRow>[]> {
  if (!isSupabaseConfigured()) {
    return getMockDailyPortfolioSnapshots().map(mapDailySnapshotRow);
  }
  const readUserId = await resolveSupabaseReadUserId(userId);
  if (!readUserId) {
    return [];
  }
  const rows = await fetchDailySnapshotsFromDb(readUserId);
  return rows.map(mapDailySnapshotRow);
}

export async function getLatestDailySnapshot(
  userId: string
): Promise<ReturnType<typeof mapDailySnapshotRow> | null> {
  const snapshots = await listDailyPortfolioSnapshots(userId);
  const asOfDate = resolveHistoryAsOfDate();
  return selectLatestSnapshot(snapshots, asOfDate);
}

export async function getSnapshotIdByDate(
  userId: string,
  snapshotDate: string
): Promise<string | null> {
  if (!isSupabaseConfigured()) {
    const match = getMockDailyPortfolioSnapshots().find(
      (s) => s.user_id === userId && s.snapshot_date === snapshotDate
    );
    return match?.id ?? null;
  }

  const readUserId = await resolveSupabaseReadUserId(userId);
  if (!readUserId) {
    return null;
  }

  const access = await resolveSupabaseServerAccess();
  if (!access || access.userId !== readUserId) {
    return null;
  }

  const supabase = await getServerSupabaseClient(access);
  const { data } = await supabase
    .from("daily_portfolio_snapshots")
    .select("id")
    .eq("user_id", readUserId)
    .eq("snapshot_date", snapshotDate)
    .maybeSingle();

  const row = data as { id: string } | null;
  return row?.id ?? null;
}

export async function snapshotDateExists(
  userId: string,
  snapshotDate: string,
  excludeId?: string
): Promise<boolean> {
  if (!isSupabaseConfigured()) {
    return getMockDailyPortfolioSnapshots().some(
      (s) =>
        s.user_id === userId &&
        s.snapshot_date === snapshotDate &&
        s.id !== excludeId
    );
  }

  const readUserId = await resolveSupabaseReadUserId(userId);
  if (!readUserId) {
    return false;
  }

  const access = await resolveSupabaseServerAccess();
  if (!access || access.userId !== readUserId) {
    return false;
  }

  const supabase = await getServerSupabaseClient(access);
  let query = supabase
    .from("daily_portfolio_snapshots")
    .select("id")
    .eq("user_id", readUserId)
    .eq("snapshot_date", snapshotDate);

  if (excludeId) {
    query = query.neq("id", excludeId);
  }

  const { data } = await query.maybeSingle();
  return data != null;
}

export async function persistDailyPortfolioRecord(input: {
  userId: string;
  form: DailyPortfolioRecordFormInput;
  metrics: PortfolioMetrics;
  trades: EnrichedTrade[];
  recordId?: string;
}): Promise<DailyPortfolioSnapshotRow> {
  const { userId, form, metrics, trades, recordId } = input;
  const today = getSingaporeSnapshotDate();

  if (form.snapshotDate !== today) {
    throw new Error(
      "Only today's snapshot can be created or updated. Use Create Snapshot on the Portfolio Dashboard."
    );
  }

  let resolvedRecordId = recordId;

  if (!resolvedRecordId) {
    resolvedRecordId =
      (await getSnapshotIdByDate(userId, form.snapshotDate)) ?? undefined;
  } else {
    const duplicate = await snapshotDateExists(
      userId,
      form.snapshotDate,
      recordId
    );
    if (duplicate) {
      throw new Error(
        `A portfolio record already exists for ${form.snapshotDate}. Choose a different date.`
      );
    }
  }

  const summary = buildTradeTrackerSummary(trades);
  const pnl = buildPortfolioPnlBreakdown(trades);
  const capitalPools = await buildPortfolioCapitalPools(metrics);
  const autoPayload = buildDailySnapshotPayload({
    metrics: { ...metrics, portfolioValue: form.portfolioValueSgd },
    openRisk: summary.totalOpenRisk,
    pnl,
    snapshotDate: form.snapshotDate,
    capitalPools,
  });

  const snapshotPayload = {
    ...autoPayload,
    snapshot_date: form.snapshotDate,
    portfolio_value_sgd: form.portfolioValueSgd,
    client_current_value_sgd: form.clientCurrentValueSgd,
    usd_cash: form.tradingCashUsd,
    sgd_cash: form.tradingCashSgd,
    usd_cash_sgd_equivalent: 0,
    crypto_cash_sgd: form.cryptoCashSgd,
    crypto_value_sgd: form.cryptoValueSgd,
    notes: form.notes,
  };

  if (!isSupabaseConfigured()) {
    if (resolvedRecordId) {
      const updated = updateMockDailyPortfolioSnapshot(resolvedRecordId, {
        ...snapshotPayload,
        is_manual_entry: true,
        entered_by: "user",
        updated_at: new Date().toISOString(),
      });
      if (!updated) throw new Error("Record not found.");
      return updated;
    }

    return upsertMockDailyPortfolioSnapshot({
      id: crypto.randomUUID(),
      user_id: userId,
      ...snapshotPayload,
      is_manual_entry: true,
      entered_by: "user",
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });
  }

  const access = await resolveSupabaseServerAccess();
  if (!access) {
    warnMissingDevUserIdForWrite();
    if (resolvedRecordId) {
      const updated = updateMockDailyPortfolioSnapshot(resolvedRecordId, {
        ...snapshotPayload,
        is_manual_entry: true,
        entered_by: "user",
        updated_at: new Date().toISOString(),
      });
      if (!updated) throw new Error("Record not found.");
      return updated;
    }
    return upsertMockDailyPortfolioSnapshot({
      id: crypto.randomUUID(),
      user_id: MOCK_USER_ID,
      ...snapshotPayload,
      is_manual_entry: true,
      entered_by: "user",
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });
  }

  const supabase = await getServerSupabaseClient(access);
  const effectiveUserId = access.userId;
  const rpcPayload = {
    id: resolvedRecordId ?? crypto.randomUUID(),
    user_id: effectiveUserId,
    ...snapshotPayload,
    created_at: new Date().toISOString(),
  };

  if (access.mode === "dev-service-role") {
    const writable: DailyPortfolioSnapshotWrite = {
      ...rpcPayload,
      is_manual_entry: true,
      entered_by: "user",
      updated_at: new Date().toISOString(),
    };

    const { data, error } = await supabase
      .from("daily_portfolio_snapshots")
      .upsert(writable as never, { onConflict: "user_id,snapshot_date" })
      .select("*")
      .single();

    if (error) throw new Error(error.message);
    return data as DailyPortfolioSnapshotRow;
  }

  const { data, error } = await supabase.rpc(
    "upsert_manual_daily_portfolio_snapshot",
    { p_payload: rpcPayload } as never
  );

  if (error) throw new Error(error.message);
  return data as DailyPortfolioSnapshotRow;
}

export async function removeDailyPortfolioSnapshot(
  userId: string,
  recordId: string
): Promise<void> {
  if (!isSupabaseConfigured()) {
    deleteMockDailyPortfolioSnapshot(recordId);
    return;
  }

  const access = await resolveSupabaseServerAccess();
  if (!access) {
    warnMissingDevUserIdForWrite();
    deleteMockDailyPortfolioSnapshot(recordId);
    return;
  }

  const supabase = await getServerSupabaseClient(access);
  const { error } = await supabase
    .from("daily_portfolio_snapshots")
    .delete()
    .eq("id", recordId)
    .eq("user_id", access.userId);

  if (error) throw new Error(error.message);
}

/** Service-role upsert for scheduled daily snapshot cron (one row per Singapore date). */
export async function upsertDailyPortfolioSnapshotAsAdmin(input: {
  admin: AdminClient;
  userId: string;
  payload: ReturnType<typeof buildDailySnapshotPayload>;
  existingCreatedAt?: string;
}): Promise<DailyPortfolioSnapshotRow> {
  const writable: DailyPortfolioSnapshotWrite = {
    id: crypto.randomUUID(),
    user_id: input.userId,
    ...input.payload,
    is_manual_entry: false,
    entered_by: "system",
    created_at: input.existingCreatedAt ?? new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  const { data, error } = await input.admin
    .from("daily_portfolio_snapshots")
    .upsert(writable as never, { onConflict: "user_id,snapshot_date" })
    .select("*")
    .single();

  if (error) throw new Error(error.message);
  return data as DailyPortfolioSnapshotRow;
}
