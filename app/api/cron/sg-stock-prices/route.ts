import { NextResponse } from "next/server";
import { runScheduledSgStockPriceRefresh } from "@/lib/stocks-etfs/run-scheduled-stock-price-refresh";
import {
  SG_STOCK_REFRESH_CRON_LOCAL,
  SG_STOCK_REFRESH_CRON_UTC,
  SG_STOCK_REFRESH_TIMEZONE,
} from "@/lib/stocks-etfs/scheduled-refresh-config";
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
  const refresh = await runScheduledSgStockPriceRefresh(now);

  return NextResponse.json({
    ok: true,
    region: "sg",
    triggeredBy: isVercelCron ? "vercel-cron" : "manual",
    schedule: {
      timezone: SG_STOCK_REFRESH_TIMEZONE,
      localTime: "17:30",
      localCron: SG_STOCK_REFRESH_CRON_LOCAL,
      utcCron: SG_STOCK_REFRESH_CRON_UTC,
    },
    usersProcessed: refresh.usersProcessed,
    rowsUpdated: refresh.results.reduce((n, r) => n + r.rowsUpdated, 0),
    rowsFailed: refresh.results.reduce((n, r) => n + r.rowsFailed, 0),
    failedTickers: [
      ...new Set(refresh.results.flatMap((r) => r.failedTickers)),
    ],
  });
}
