import { NextResponse } from "next/server";
import { isUsMarketClosedForDay } from "@/lib/market-calendar/nyse-calendar";
import { runScheduledWatchlistRefreshForUser } from "@/lib/watchlist/run-scheduled-watchlist-refresh";
import {
  WATCHLIST_REFRESH_CRON_LOCAL,
  WATCHLIST_REFRESH_CRON_UTC,
  WATCHLIST_REFRESH_TIMEZONE,
} from "@/lib/watchlist/scheduled-refresh-config";
import { createAdminClient } from "@/lib/supabase/admin";
import { isSupabaseConfigured } from "@/lib/supabase/is-configured";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

async function listActiveWatchlistUserIds(): Promise<string[]> {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("watchlist")
    .select("user_id")
    .eq("is_active", true);

  if (error) throw new Error(error.message);

  const ids = new Set<string>();
  for (const row of data ?? []) {
    ids.add((row as { user_id: string }).user_id);
  }
  return [...ids];
}

export async function GET(request: Request) {
  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET?.trim();
  const isVercelCron = request.headers.get("user-agent")?.includes("vercel-cron");

  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!isSupabaseConfigured()) {
    return NextResponse.json(
      { error: "Supabase is not configured" },
      { status: 503 }
    );
  }

  const now = new Date();
  if (!isUsMarketClosedForDay(now)) {
    return NextResponse.json({
      skipped: true,
      reason: "US market session not yet closed — completed daily candles unavailable",
      schedule: {
        timezone: WATCHLIST_REFRESH_TIMEZONE,
        localCron: WATCHLIST_REFRESH_CRON_LOCAL,
        utcCron: WATCHLIST_REFRESH_CRON_UTC,
      },
    });
  }

  const userIds = await listActiveWatchlistUserIds();
  const results: {
    userId: string;
    tickersProcessed: number;
    tickersFailed: number;
    completedCandleDate: string;
    providerSource: string;
    errors: string[];
  }[] = [];

  for (const userId of userIds) {
    try {
      const refresh = await runScheduledWatchlistRefreshForUser(userId, now);
      results.push({
        userId,
        tickersProcessed: refresh.sync.tickersProcessed,
        tickersFailed: refresh.sync.tickersFailed,
        completedCandleDate: refresh.sync.completedCandleDate,
        providerSource: refresh.sync.providerSource,
        errors: refresh.errors,
      });
    } catch (e) {
      const message = e instanceof Error ? e.message : "Watchlist refresh failed";
      results.push({
        userId,
        tickersProcessed: 0,
        tickersFailed: 0,
        completedCandleDate: "",
        providerSource: "none",
        errors: [message],
      });
    }
  }

  return NextResponse.json({
    ok: true,
    triggeredBy: isVercelCron ? "vercel-cron" : "manual",
    schedule: {
      timezone: WATCHLIST_REFRESH_TIMEZONE,
      localTime: "06:00",
      localCron: WATCHLIST_REFRESH_CRON_LOCAL,
      utcCron: WATCHLIST_REFRESH_CRON_UTC,
    },
    usersProcessed: results.length,
    results,
  });
}
