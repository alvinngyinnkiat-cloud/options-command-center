import { NextResponse } from "next/server";
import { runScheduledDailyPortfolioSnapshot } from "@/lib/portfolio/run-scheduled-daily-portfolio-snapshot";
import {
  PORTFOLIO_SNAPSHOT_CRON_LOCAL,
  PORTFOLIO_SNAPSHOT_CRON_UTC,
  PORTFOLIO_SNAPSHOT_TIMEZONE,
} from "@/lib/portfolio/scheduled-snapshot-config";
import { getSingaporeSnapshotDate } from "@/lib/portfolio/snapshot-date";
import { isSupabaseConfigured } from "@/lib/supabase/is-configured";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

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
  const snapshotDate = getSingaporeSnapshotDate(now);
  const { usersProcessed, results } =
    await runScheduledDailyPortfolioSnapshot(now);

  const succeeded = results.filter((r) => !r.error).length;
  const failed = results.filter((r) => r.error).length;

  return NextResponse.json({
    ok: failed === 0,
    triggeredBy: isVercelCron ? "vercel-cron" : "manual",
    snapshotDate,
    schedule: {
      timezone: PORTFOLIO_SNAPSHOT_TIMEZONE,
      localTime: "23:59",
      localCron: PORTFOLIO_SNAPSHOT_CRON_LOCAL,
      utcCron: PORTFOLIO_SNAPSHOT_CRON_UTC,
    },
    usersProcessed,
    succeeded,
    failed,
    results,
  });
}
