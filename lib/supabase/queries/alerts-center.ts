import {
  applyAlertStatuses,
  buildAlertsCenterData,
  buildAllAlerts,
} from "@/lib/alerts/aggregate";
import type { AlertStatus, AlertsCenterData } from "@/lib/alerts/types";
import {
  getMockAlertStatuses,
  setMockAlertStatus,
} from "@/lib/mock/alert-status-store";
import { getRiskDashboardData } from "@/lib/supabase/queries/risk-dashboard";
import { getOptionsTradesData } from "@/lib/supabase/queries/options-trades";
import { getWatchlistScannerData } from "@/lib/supabase/queries/watchlist-scanner";
import { getWeekendReviewStatus } from "@/lib/supabase/queries/weekly-market-updates";
import { isSupabaseConfigured } from "@/lib/supabase/is-configured";
import { createClient } from "@/lib/supabase/server";

async function resolveUserId(): Promise<string | undefined> {
  if (!isSupabaseConfigured()) return undefined;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user?.id;
}

async function loadPersistedStatuses(
  userId?: string
): Promise<Map<string, AlertStatus>> {
  if (!isSupabaseConfigured() || !userId) {
    return getMockAlertStatuses();
  }

  try {
    const supabase = await createClient();
    const { data } = await supabase
      .from("alerts")
      .select("title, is_active, is_read")
      .eq("user_id", userId);

    const map = new Map<string, AlertStatus>();
    for (const row of data ?? []) {
      const r = row as { title: string; is_active: boolean; is_read: boolean };
      const status: AlertStatus = !r.is_active
        ? "resolved"
        : r.is_read
          ? "dismissed"
          : "active";
      map.set(r.title, status);
    }
    return map;
  } catch {
    return getMockAlertStatuses();
  }
}

export async function persistAlertStatus(
  key: string,
  status: AlertStatus,
  userId?: string
): Promise<void> {
  const uid = userId ?? (await resolveUserId());

  if (!isSupabaseConfigured() || !uid) {
    setMockAlertStatus(key, status);
    return;
  }

  const supabase = await createClient();
  const now = new Date().toISOString();
  const tickerPart = key.split(":")[2];
  const ticker = tickerPart && tickerPart !== "global" ? tickerPart : null;

  const { data: existing } = await supabase
    .from("alerts")
    .select("id")
    .eq("user_id", uid)
    .eq("title", key)
    .maybeSingle();

  const payload = {
    id: existing ? (existing as { id: string }).id : crypto.randomUUID(),
    user_id: uid,
    ticker,
    alert_type: "system" as const,
    title: key,
    message: `Alert status: ${status}`,
    threshold_value: null,
    is_active: status === "active",
    is_read: status === "dismissed" || status === "resolved",
    triggered_at: now,
    created_at: now,
    updated_at: now,
  };

  await supabase.from("alerts").upsert(payload as never);
}

export async function getAlertsCenterData(): Promise<AlertsCenterData> {
  const [watchlist, tradesData, riskData] = await Promise.all([
    getWatchlistScannerData(),
    getOptionsTradesData(),
    getRiskDashboardData(),
  ]);

  const reviewStatus = await getWeekendReviewStatus(
    watchlist.rows.length,
    watchlist.dataSource
  );

  const userId = await resolveUserId();

  const raw = buildAllAlerts({
    watchlistRows: watchlist.rows,
    trades: tradesData.trades,
    riskData,
    reviewStatus,
  });

  const statuses = await loadPersistedStatuses(userId);
  const alerts = applyAlertStatuses(raw, statuses);

  return buildAlertsCenterData(alerts, watchlist.dataSource);
}
