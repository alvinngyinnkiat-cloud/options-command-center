import { createAdminClient } from "@/lib/supabase/admin";
import {
  getWatchlistScannerDataForUser,
} from "@/lib/supabase/queries/watchlist-scanner";
import {
  getServerSupabaseClient,
  resolveSupabaseServerAccess,
} from "@/lib/supabase/server-write";
import { NotAuthenticatedError } from "@/lib/supabase/resolve-user";
import { syncWatchlistDataForUser } from "@/lib/watchlist/sync-watchlist-data";
import type { SyncWatchlistDataResult } from "@/lib/watchlist/sync-watchlist-data";
import type { WatchlistScannerData } from "@/lib/watchlist/types";

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
  const scanner = await getWatchlistScannerDataForUser(effectiveUserId, supabase);
  return { sync, scanner };
}

/** Cron / service-role path — no authenticated session required. */
export async function refreshWatchlistScannerForUserAsAdmin(
  userId: string,
  now: Date = new Date()
): Promise<RefreshWatchlistScannerResult> {
  const admin = createAdminClient();
  const sync = await syncWatchlistDataForUser(userId, now, admin);
  const scanner = await getWatchlistScannerDataForUser(userId, admin);
  return { sync, scanner };
}
