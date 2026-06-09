import {
  getWatchlistScannerDataForUser,
} from "@/lib/supabase/queries/watchlist-scanner";
import {
  getServerSupabaseClient,
  resolveSupabaseServerAccess,
} from "@/lib/supabase/server-write";
import { NotAuthenticatedError } from "@/lib/supabase/resolve-user";
import { createAdminClient } from "@/lib/supabase/admin";
import { syncWatchlistDataForUser } from "@/lib/watchlist/sync-watchlist-data";
import { WATCHLIST_MANUAL_REFRESH_LOG_SOURCE } from "@/lib/watchlist/sync-concurrency";
import type { SyncWatchlistDataResult } from "@/lib/watchlist/sync-watchlist-data";
import type { WatchlistScannerData } from "@/lib/watchlist/types";
import type { Database } from "@/types/database";
import type { SupabaseClient } from "@supabase/supabase-js";
import { randomUUID } from "crypto";
import { revalidatePath } from "next/cache";

export interface RefreshWatchlistScannerResult {
  sync: SyncWatchlistDataResult;
  scanner: WatchlistScannerData;
}

export async function refreshWatchlistScannerForUser(
  _userId: string,
  now: Date = new Date()
): Promise<RefreshWatchlistScannerResult> {
  const access = await resolveSupabaseServerAccess();
  if (!access) {
    throw new NotAuthenticatedError();
  }

  const supabase = await getServerSupabaseClient(access);
  const effectiveUserId = access.userId;

  const sync = await syncWatchlistDataForUser(effectiveUserId, now, supabase);
  const scanner = await getWatchlistScannerDataForUser(
    effectiveUserId,
    supabase,
    { persistScores: true }
  );
  return { sync, scanner };
}

type AdminClient = SupabaseClient<Database>;

async function logManualRefresh(input: {
  userId: string;
  startedAt: string;
  sync: SyncWatchlistDataResult;
  admin: AdminClient;
}) {
  const { userId, startedAt, sync, admin } = input;
  const completedAt = new Date().toISOString();
  const status =
    sync.tickersFailed === 0
      ? "success"
      : sync.tickersProcessed > sync.tickersFailed
        ? "partial"
        : "failed";

  await admin.from("data_source_logs").insert({
    id: randomUUID(),
    user_id: userId,
    source_name: WATCHLIST_MANUAL_REFRESH_LOG_SOURCE,
    status,
    records_updated: sync.marketRowsUpserted + sync.indicatorRowsUpserted,
    records_failed: sync.tickersFailed,
    error_message:
      sync.errors.length > 0 ? sync.errors.slice(0, 5).join("; ") : null,
    started_at: startedAt,
    completed_at: completedAt,
    created_at: completedAt,
  } as never);

  await admin.from("data_source_logs").insert({
    id: randomUUID(),
    user_id: userId,
    source_name: "market_data",
    status:
      sync.tickersFailed > 0
        ? sync.tickersProcessed > sync.tickersFailed
          ? "partial"
          : "failed"
        : "success",
    records_updated: sync.marketRowsUpserted,
    records_failed: sync.tickersFailed,
    error_message:
      sync.errors.length > 0 ? sync.errors.slice(0, 3).join("; ") : null,
    started_at: startedAt,
    completed_at: completedAt,
    created_at: completedAt,
  } as never);
}

/** Runs full sync + score persist — uses service role (safe inside after() / cron). */
export async function runWatchlistScannerRefreshJob(
  userId: string,
  startedAt: string,
  now: Date = new Date()
): Promise<RefreshWatchlistScannerResult> {
  console.log(`[watchlist-refresh] Job started for user ${userId}`);

  const admin = createAdminClient();
  const sync = await syncWatchlistDataForUser(userId, now, admin);
  const scanner = await getWatchlistScannerDataForUser(userId, admin, {
    persistScores: true,
  });

  await logManualRefresh({ userId, startedAt, sync, admin });

  revalidatePath("/watchlist");
  revalidatePath("/data-health");

  console.log(
    `[watchlist-refresh] Job complete: ${sync.tickersProcessed - sync.tickersFailed}/${sync.tickersProcessed} tickers`
  );

  return { sync, scanner };
}

/** Cron / service-role path — no authenticated session required. */
export async function refreshWatchlistScannerForUserAsAdmin(
  userId: string,
  now: Date = new Date()
): Promise<RefreshWatchlistScannerResult> {
  const admin = createAdminClient();
  const sync = await syncWatchlistDataForUser(userId, now, admin);
  const scanner = await getWatchlistScannerDataForUser(userId, admin, {
    persistScores: true,
  });
  return { sync, scanner };
}
