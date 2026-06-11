import { randomUUID } from "crypto";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  fetchAllTimeContributionsForUser,
  getEnrichedPortfolioMetricsForUser,
} from "@/lib/portfolio/admin-user-portfolio";
import { buildDailySnapshotPayload } from "@/lib/portfolio/daily-snapshot";
import { PORTFOLIO_SNAPSHOT_LOG_SOURCE } from "@/lib/portfolio/scheduled-snapshot-config";
import { getSingaporeSnapshotDate } from "@/lib/portfolio/snapshot-date";
import { upsertDailyPortfolioSnapshotAsAdmin } from "@/lib/supabase/queries/daily-portfolio-snapshots";
import { enrichTrade } from "@/lib/trades/map-trade";
import { buildPortfolioPnlBreakdown } from "@/lib/trades/pnl-allocation";
import { buildTradeTrackerSummary } from "@/lib/trades/summary";
import type { Database } from "@/types/database";
import type { OptionsTrade } from "@/types/database";

type AdminClient = SupabaseClient<Database>;

export interface DailyPortfolioSnapshotCronResult {
  userId: string;
  snapshotDate: string;
  myPortfolioValue: number;
  updated: boolean;
  error?: string;
}

async function listPortfolioSnapshotUserIds(
  admin: AdminClient
): Promise<string[]> {
  const tables = [
    "portfolio_overrides",
    "daily_portfolio_snapshots",
    "monthly_contributions",
    "stock_etf_holdings",
    "crypto_holdings",
    "options_trades",
  ] as const;

  const ids = new Set<string>();

  await Promise.all(
    tables.map(async (table) => {
      const { data, error } = await admin.from(table).select("user_id");
      if (error) return;
      for (const row of data ?? []) {
        ids.add((row as { user_id: string }).user_id);
      }
    })
  );

  return [...ids];
}

async function logSnapshotRun(
  admin: AdminClient,
  userId: string,
  startedAt: string,
  result: DailyPortfolioSnapshotCronResult
): Promise<void> {
  await admin.from("data_source_logs").insert({
    id: randomUUID(),
    user_id: userId,
    source_name: PORTFOLIO_SNAPSHOT_LOG_SOURCE,
    status: result.error ? "failed" : "success",
    records_updated: result.error ? 0 : 1,
    records_failed: result.error ? 1 : 0,
    error_message: result.error ?? null,
    started_at: startedAt,
    completed_at: new Date().toISOString(),
    created_at: new Date().toISOString(),
  } as never);
}

export async function runScheduledDailyPortfolioSnapshotForUser(
  userId: string,
  now: Date = new Date(),
  admin: AdminClient = createAdminClient()
): Promise<DailyPortfolioSnapshotCronResult> {
  const snapshotDate = getSingaporeSnapshotDate(now);

  try {
    const [{ metrics, capitalPools }, totalContributionsSgd, tradesRes] =
      await Promise.all([
        getEnrichedPortfolioMetricsForUser(admin, userId),
        fetchAllTimeContributionsForUser(admin, userId),
        admin.from("options_trades").select("*").eq("user_id", userId),
      ]);

    const enrichedTrades = ((tradesRes.data ?? []) as OptionsTrade[]).map((row) =>
      enrichTrade(row, {})
    );
    const summary = buildTradeTrackerSummary(enrichedTrades);
    const pnl = buildPortfolioPnlBreakdown(enrichedTrades);

    const payload = buildDailySnapshotPayload({
      metrics,
      openRisk: summary.totalOpenRisk,
      pnl,
      snapshotDate,
      capitalPools,
      totalContributionsSgd,
    });

    const existingRes = await admin
      .from("daily_portfolio_snapshots")
      .select("id, created_at")
      .eq("user_id", userId)
      .eq("snapshot_date", snapshotDate)
      .maybeSingle();

    await upsertDailyPortfolioSnapshotAsAdmin({
      admin,
      userId,
      payload,
      existingCreatedAt: (existingRes.data as { created_at: string } | null)
        ?.created_at,
    });

    return {
      userId,
      snapshotDate,
      myPortfolioValue: capitalPools.myPortfolioValue,
      updated: true,
    };
  } catch (e) {
    return {
      userId,
      snapshotDate,
      myPortfolioValue: 0,
      updated: false,
      error: e instanceof Error ? e.message : "Snapshot failed",
    };
  }
}

export async function runScheduledDailyPortfolioSnapshot(
  now: Date = new Date(),
  admin: AdminClient = createAdminClient()
): Promise<{
  usersProcessed: number;
  results: DailyPortfolioSnapshotCronResult[];
}> {
  const startedAt = now.toISOString();
  const userIds = await listPortfolioSnapshotUserIds(admin);
  const results: DailyPortfolioSnapshotCronResult[] = [];

  for (const userId of userIds) {
    const result = await runScheduledDailyPortfolioSnapshotForUser(
      userId,
      now,
      admin
    );
    results.push(result);
    await logSnapshotRun(admin, userId, startedAt, result);
  }

  return { usersProcessed: userIds.length, results };
}
