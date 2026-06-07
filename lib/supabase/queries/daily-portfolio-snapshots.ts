import { buildPortfolioCapitalPools } from "@/lib/portfolio/enrich-capital-pools";
import type { CapitalPoolsBreakdown } from "@/lib/portfolio/capital-pools";
import { MOCK_REFERENCE_DATE } from "@/lib/mock/reference-dates";
import {
  buildHistoryComparisons,
  buildMilestones,
  buildPerformanceMetrics,
  generateMockSnapshotHistory,
} from "@/lib/portfolio/snapshot-history";
import type { PortfolioHistoryData } from "@/lib/portfolio/daily-snapshot-types";
import {
  applyMockGeneratedSnapshotColumns,
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
import { createClient } from "@/lib/supabase/server";
import type {
  DailyPortfolioSnapshot as DailyPortfolioSnapshotRow,
  DailyPortfolioSnapshotWrite,
} from "@/types/database";

export interface DailyPortfolioRecordFormInput {
  snapshotDate: string;
  portfolioValueSgd: number;
  notes: string | null;
}

function buildHistoryData(
  snapshots: ReturnType<typeof mapDailySnapshotRow>[],
  dataSource: "supabase" | "mock",
  asOfDate: string
): PortfolioHistoryData {
  const latest = snapshots[snapshots.length - 1] ?? null;
  return {
    snapshots,
    latest,
    comparisons: buildHistoryComparisons(snapshots, asOfDate),
    performance: buildPerformanceMetrics(snapshots, asOfDate),
    milestones: buildMilestones(snapshots, asOfDate),
    dataSource,
  };
}

export async function upsertDailyPortfolioSnapshot(input: {
  userId: string;
  metrics: PortfolioMetrics;
  trades: EnrichedTrade[];
  snapshotDate?: string;
  capitalPools?: CapitalPoolsBreakdown;
}): Promise<DailyPortfolioSnapshotRow> {
  const summary = buildTradeTrackerSummary(input.trades);
  const pnl = buildPortfolioPnlBreakdown(input.trades);
  const capitalPools =
    input.capitalPools ?? (await buildPortfolioCapitalPools(input.metrics));
  const payload = buildDailySnapshotPayload({
    metrics: input.metrics,
    openRisk: summary.totalOpenRisk,
    pnl,
    snapshotDate: input.snapshotDate,
    capitalPools,
  });

  if (!isSupabaseConfigured()) {
    return upsertMockDailyPortfolioSnapshot({
      id: crypto.randomUUID(),
      user_id: input.userId,
      ...payload,
      is_manual_entry: false,
      entered_by: "system",
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });
  }

  const supabase = await createClient();
  const { data: existing } = await supabase
    .from("daily_portfolio_snapshots")
    .select("id, created_at, notes, is_manual_entry")
    .eq("user_id", input.userId)
    .eq("snapshot_date", payload.snapshot_date)
    .maybeSingle();

  const existingRow = existing as {
    id: string;
    created_at: string;
    notes: string | null;
    is_manual_entry: boolean;
  } | null;

  if (existingRow?.is_manual_entry) {
    const { data: manualRow, error: fetchError } = await supabase
      .from("daily_portfolio_snapshots")
      .select("*")
      .eq("id", existingRow.id)
      .single();
    if (fetchError) throw new Error(fetchError.message);
    return manualRow as DailyPortfolioSnapshotRow;
  }

  const writable: DailyPortfolioSnapshotWrite = {
    id: existingRow?.id ?? crypto.randomUUID(),
    user_id: input.userId,
    ...payload,
    notes: existingRow?.notes ?? payload.notes ?? null,
    is_manual_entry: false,
    entered_by: "system",
    created_at: existingRow?.created_at ?? new Date().toISOString(),
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

async function fetchDailySnapshotsFromDb(
  userId: string
): Promise<DailyPortfolioSnapshotRow[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("daily_portfolio_snapshots")
    .select("*")
    .eq("user_id", userId)
    .order("snapshot_date", { ascending: true });

  if (error) throw new Error(error.message);
  return (data ?? []) as DailyPortfolioSnapshotRow[];
}

export async function getLatestDailySnapshotValue(
  userId?: string
): Promise<number | null> {
  if (!isSupabaseConfigured() || !userId) {
    const rows = getMockDailyPortfolioSnapshots();
    const latest = rows[rows.length - 1];
    return latest ? Number(latest.portfolio_value_sgd) : null;
  }

  const supabase = await createClient();
  const { data } = await supabase
    .from("daily_portfolio_snapshots")
    .select("portfolio_value_sgd")
    .eq("user_id", userId)
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
  const date = input.asOfDate ?? new Date().toISOString().slice(0, 10);
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
  const asOfDate = input.asOfDate ?? MOCK_REFERENCE_DATE;
  const capitalPools =
    input.capitalPools ?? (await buildPortfolioCapitalPools(input.metrics));

  if (!isSupabaseConfigured()) {
    let rows = getMockDailyPortfolioSnapshots();
    if (rows.length === 0) {
      const generated = generateMockSnapshotHistory(
        input.metrics.portfolioValue,
        asOfDate
      );
      rows = generated.map((s) =>
        applyMockGeneratedSnapshotColumns({
          id: s.id,
          user_id: input.userId,
          snapshot_date: s.snapshotDate,
          portfolio_value_sgd: s.portfolioValueSgd,
          stock_options_value_sgd: s.stockOptionsValueSgd,
          crypto_value_sgd: s.cryptoValueSgd,
          usd_cash: s.usdCash,
          sgd_cash: s.sgdCash,
          usd_cash_sgd_equivalent: s.usdCashSgdEquivalent,
          crypto_cash_sgd: s.cryptoCashSgd,
          us_etf_value_sgd: 0,
          us_stock_value_sgd: 0,
          sg_stock_value_sgd: 0,
          current_options_value_sgd: 0,
          open_risk: s.openRisk,
          available_risk_capacity: s.availableRiskCapacity,
          personal_unrealized_pnl: s.personalUnrealizedPnl,
          personal_realized_pnl: s.personalRealizedPnl,
          client_pnl: s.clientPnl,
          client_initial_capital_sgd: s.clientInitialCapitalSgd,
          client_current_value_sgd: s.clientCurrentValueSgd,
          portfolio_health_score: s.portfolioHealthScore,
          notes: s.notes,
          is_manual_entry: false,
          entered_by: "system",
          created_at: s.createdAt,
          updated_at: s.createdAt,
        })
      );
      setMockDailyPortfolioSnapshots(rows);
    }

    await ensureDailyPortfolioSnapshot({
      userId: input.userId,
      metrics: input.metrics,
      trades: input.trades,
      capitalPools,
      asOfDate,
    });
    rows = getMockDailyPortfolioSnapshots();

    const snapshots = rows.map(mapDailySnapshotRow);
    return buildHistoryData(snapshots, "mock", asOfDate);
  }

  await ensureDailyPortfolioSnapshot({
    userId: input.userId,
    metrics: input.metrics,
    trades: input.trades,
    capitalPools,
    asOfDate,
  });

  const rows = await fetchDailySnapshotsFromDb(input.userId);
  const snapshots = rows.map(mapDailySnapshotRow);
  return buildHistoryData(snapshots, "supabase", asOfDate);
}

export async function listDailyPortfolioSnapshots(
  userId: string
): Promise<ReturnType<typeof mapDailySnapshotRow>[]> {
  if (!isSupabaseConfigured()) {
    return getMockDailyPortfolioSnapshots().map(mapDailySnapshotRow);
  }
  const rows = await fetchDailySnapshotsFromDb(userId);
  return rows.map(mapDailySnapshotRow);
}

export async function getLatestDailySnapshot(
  userId: string
): Promise<ReturnType<typeof mapDailySnapshotRow> | null> {
  const snapshots = await listDailyPortfolioSnapshots(userId);
  return snapshots[snapshots.length - 1] ?? null;
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

  const supabase = await createClient();
  const { data } = await supabase
    .from("daily_portfolio_snapshots")
    .select("id")
    .eq("user_id", userId)
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

  const supabase = await createClient();
  let query = supabase
    .from("daily_portfolio_snapshots")
    .select("id")
    .eq("user_id", userId)
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

  if (!isSupabaseConfigured()) {
    if (resolvedRecordId) {
      const updated = updateMockDailyPortfolioSnapshot(resolvedRecordId, {
        ...autoPayload,
        snapshot_date: form.snapshotDate,
        portfolio_value_sgd: form.portfolioValueSgd,
        notes: form.notes,
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
      ...autoPayload,
      portfolio_value_sgd: form.portfolioValueSgd,
      notes: form.notes,
      is_manual_entry: true,
      entered_by: "user",
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });
  }

  const supabase = await createClient();
  const rpcPayload = {
    id: resolvedRecordId ?? crypto.randomUUID(),
    user_id: userId,
    ...autoPayload,
    snapshot_date: form.snapshotDate,
    portfolio_value_sgd: form.portfolioValueSgd,
    notes: form.notes,
    created_at: new Date().toISOString(),
  };

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

  const supabase = await createClient();
  const { error } = await supabase
    .from("daily_portfolio_snapshots")
    .delete()
    .eq("id", recordId)
    .eq("user_id", userId);

  if (error) throw new Error(error.message);
}
