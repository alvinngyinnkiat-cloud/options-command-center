import { NextResponse } from "next/server";
import { isUsMarketClosedForDay } from "@/lib/market-calendar/nyse-calendar";
import { runScheduledUsStockEtfPriceRefresh } from "@/lib/stocks-etfs/run-scheduled-stock-price-refresh";
import {
  US_STOCK_ETF_REFRESH_CRON_LOCAL,
  US_STOCK_ETF_REFRESH_CRON_UTC,
  US_STOCK_ETF_REFRESH_TIMEZONE,
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
  if (!isUsMarketClosedForDay(now)) {
    return NextResponse.json({
      skipped: true,
      reason: "US market session not yet closed — completed daily candles unavailable",
      schedule: {
        timezone: US_STOCK_ETF_REFRESH_TIMEZONE,
        localTime: "06:00",
        localCron: US_STOCK_ETF_REFRESH_CRON_LOCAL,
        utcCron: US_STOCK_ETF_REFRESH_CRON_UTC,
      },
    });
  }

  const refresh = await runScheduledUsStockEtfPriceRefresh(now);

  return NextResponse.json({
    ok: true,
    region: "us",
    triggeredBy: isVercelCron ? "vercel-cron" : "manual",
    schedule: {
      timezone: US_STOCK_ETF_REFRESH_TIMEZONE,
      localTime: "06:00",
      localCron: US_STOCK_ETF_REFRESH_CRON_LOCAL,
      utcCron: US_STOCK_ETF_REFRESH_CRON_UTC,
    },
    usersProcessed: refresh.usersProcessed,
    rowsUpdated: refresh.results.reduce((n, r) => n + r.rowsUpdated, 0),
    rowsFailed: refresh.results.reduce((n, r) => n + r.rowsFailed, 0),
    failedTickers: [
      ...new Set(refresh.results.flatMap((r) => r.failedTickers)),
    ],
  });
}
