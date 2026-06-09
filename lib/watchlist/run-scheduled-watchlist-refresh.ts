import type { SupabaseClient } from "@supabase/supabase-js";
import { createAdminClient } from "@/lib/supabase/admin";
import { getWatchlistScannerDataForUser } from "@/lib/supabase/queries/watchlist-scanner";
import { WATCHLIST_SCHEDULED_LOG_SOURCE } from "@/lib/watchlist/scheduled-refresh-config";
import {
  syncWatchlistDataForUser,
  type SyncWatchlistDataResult,
} from "@/lib/watchlist/sync-watchlist-data";
import type { Database } from "@/types/database";
import { randomUUID } from "crypto";

export interface ScheduledWatchlistRefreshResult {
  sync: SyncWatchlistDataResult;
  errors: string[];
}

type AdminClient = SupabaseClient<Database>;

async function logScheduledRefresh(input: {
  userId: string;
  startedAt: string;
  sync: SyncWatchlistDataResult;
  admin: AdminClient;
}) {
  const { userId, startedAt, sync, admin } = input;

  const marketOk = sync.tickersFailed === 0;
  const status =
    marketOk
      ? "success"
      : sync.tickersProcessed > sync.tickersFailed
        ? "partial"
        : "failed";

  await admin.from("data_source_logs").insert({
    id: randomUUID(),
    user_id: userId,
    source_name: WATCHLIST_SCHEDULED_LOG_SOURCE,
    status,
    records_updated: sync.marketRowsUpserted + sync.indicatorRowsUpserted,
    records_failed: sync.tickersFailed,
    error_message:
      sync.errors.length > 0 ? sync.errors.slice(0, 5).join("; ") : null,
    started_at: startedAt,
    completed_at: new Date().toISOString(),
    created_at: new Date().toISOString(),
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
    completed_at: new Date().toISOString(),
    created_at: new Date().toISOString(),
  } as never);

  await admin.from("data_source_logs").insert({
    id: randomUUID(),
    user_id: userId,
    source_name: "technical_indicators",
    status:
      sync.tickersFailed > 0
        ? sync.tickersProcessed > sync.tickersFailed
          ? "partial"
          : "failed"
        : "success",
    records_updated: sync.indicatorRowsUpserted,
    records_failed: sync.tickersFailed,
    error_message:
      sync.errors.length > 0 ? sync.errors.slice(0, 3).join("; ") : null,
    started_at: startedAt,
    completed_at: new Date().toISOString(),
    created_at: new Date().toISOString(),
  } as never);
}

export async function runScheduledWatchlistRefreshForUser(
  userId: string,
  now: Date = new Date(),
  admin: AdminClient = createAdminClient()
): Promise<ScheduledWatchlistRefreshResult> {
  const startedAt = now.toISOString();
  const sync = await syncWatchlistDataForUser(userId, now, admin);
  await getWatchlistScannerDataForUser(userId, admin);

  await logScheduledRefresh({
    userId,
    startedAt,
    sync,
    admin,
  });

  return {
    sync,
    errors: [...sync.errors],
  };
}
