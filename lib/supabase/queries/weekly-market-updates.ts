import { parseStableDate } from "@/lib/format/datetime";
import { MOCK_REFERENCE_DATE } from "@/lib/mock/reference-dates";
import {
  getNextReviewDueDate,
  getReviewDate,
  getWeekEndingForReview,
  isReviewDue,
} from "@/lib/weekend-review/dates";
import { buildWeeklyMarketSnapshots } from "@/lib/weekend-review/snapshot";
import type {
  WeekendReviewStatus,
  WeeklyMarketUpdateRecord,
} from "@/lib/weekend-review/types";
import {
  getMockWeekendReviewDate,
  setMockWeekendReviewDate,
  setMockWeeklyMarketSnapshots,
} from "@/lib/mock/weekend-review-state";
import type { WatchlistScannerRow } from "@/lib/watchlist/types";
import { isSupabaseConfigured } from "@/lib/supabase/is-configured";
import { createClient } from "@/lib/supabase/server";
import type { WeeklyMarketUpdate } from "@/types/database";

function mapDbRow(row: WeeklyMarketUpdate): WeeklyMarketUpdateRecord {
  return {
    id: row.id,
    reviewDate: row.created_at.split("T")[0],
    weekEnding: row.week_ending,
    ticker: row.ticker,
    watchlistId: row.watchlist_id,
    support1: row.support_1 != null ? Number(row.support_1) : null,
    support2: row.support_2 != null ? Number(row.support_2) : null,
    resistance1: row.resistance_1 != null ? Number(row.resistance_1) : null,
    resistance2: row.resistance_2 != null ? Number(row.resistance_2) : null,
    analystNotes: row.analyst_notes,
  };
}

export async function getWeekendReviewStatus(
  tickerCount = 0,
  dataSource: "supabase" | "mock" = "mock"
): Promise<WeekendReviewStatus> {
  if (!isSupabaseConfigured()) {
    const lastReviewDate = getMockWeekendReviewDate();
    const nextReviewDueDate = getNextReviewDueDate(lastReviewDate);
    return {
      lastReviewDate,
      nextReviewDueDate,
      weekEnding: lastReviewDate ? getWeekEndingForReview(new Date(`${lastReviewDate}T12:00:00`)) : null,
      tickerCount,
      dataSource: "mock",
      isDue: isReviewDue(
        lastReviewDate,
        nextReviewDueDate,
        parseStableDate(MOCK_REFERENCE_DATE)
      ),
    };
  }

  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      const lastReviewDate = getMockWeekendReviewDate();
      const nextReviewDueDate = getNextReviewDueDate(lastReviewDate);
      return {
        lastReviewDate,
        nextReviewDueDate,
        weekEnding: null,
        tickerCount,
        dataSource: "mock",
        isDue: isReviewDue(
          lastReviewDate,
          nextReviewDueDate,
          parseStableDate(MOCK_REFERENCE_DATE)
        ),
      };
    }

    const { data } = await supabase
      .from("weekly_market_updates")
      .select("created_at, week_ending")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    const lastReviewDate = data
      ? (data as { created_at: string }).created_at.split("T")[0]
      : null;
    const weekEnding = data
      ? (data as { week_ending: string }).week_ending
      : null;
    const nextReviewDueDate = getNextReviewDueDate(lastReviewDate);

    return {
      lastReviewDate,
      nextReviewDueDate,
      weekEnding,
      tickerCount,
      dataSource: "supabase",
      isDue: isReviewDue(lastReviewDate, nextReviewDueDate),
    };
  } catch {
    const lastReviewDate = getMockWeekendReviewDate();
    const nextReviewDueDate = getNextReviewDueDate(lastReviewDate);
    return {
      lastReviewDate,
      nextReviewDueDate,
      weekEnding: null,
      tickerCount,
      dataSource: "mock",
      isDue: isReviewDue(lastReviewDate, nextReviewDueDate),
    };
  }
}

/**
 * Persists S/R snapshots from current rows into weekly_market_updates.
 * Does NOT modify support_resistance — manual levels stay unchanged.
 */
export async function persistWeeklyMarketReviewSnapshots(
  rows: WatchlistScannerRow[],
  userId?: string
): Promise<{
  snapshots: WeeklyMarketUpdateRecord[];
  reviewDate: string;
  dataSource: "supabase" | "mock";
}> {
  const reviewDate = getReviewDate();
  const weekEnding = getWeekEndingForReview();
  const snapshots = buildWeeklyMarketSnapshots(rows, reviewDate, weekEnding);

  if (!isSupabaseConfigured() || !userId) {
    setMockWeekendReviewDate(reviewDate);
    setMockWeeklyMarketSnapshots(snapshots);
    return { snapshots, reviewDate, dataSource: "mock" };
  }

  const supabase = await createClient();
  const now = new Date().toISOString();

  for (const snap of snapshots) {
    const { data: existing } = await supabase
      .from("weekly_market_updates")
      .select("id")
      .eq("watchlist_id", snap.watchlistId)
      .eq("week_ending", weekEnding)
      .maybeSingle();

    const payload: WeeklyMarketUpdate = {
      id: existing ? (existing as { id: string }).id : crypto.randomUUID(),
      user_id: userId,
      watchlist_id: snap.watchlistId,
      ticker: snap.ticker,
      week_ending: weekEnding,
      support_1: snap.support1,
      support_2: snap.support2,
      resistance_1: snap.resistance1,
      resistance_2: snap.resistance2,
      analyst_notes: snap.analystNotes,
      created_at: now,
      updated_at: now,
    };

    await supabase
      .from("weekly_market_updates")
      .upsert(payload as never, { onConflict: "watchlist_id,week_ending" });
  }

  return { snapshots, reviewDate, dataSource: "supabase" };
}

export async function getWeeklyMarketUpdateHistory(
  limit = 50
): Promise<WeeklyMarketUpdateRecord[]> {
  if (!isSupabaseConfigured()) {
    const { getMockWeeklyMarketSnapshots } = await import(
      "@/lib/mock/weekend-review-state"
    );
    return getMockWeeklyMarketSnapshots().slice(0, limit);
  }

  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) return [];

    const { data } = await supabase
      .from("weekly_market_updates")
      .select("*")
      .eq("user_id", user.id)
      .order("week_ending", { ascending: false })
      .order("ticker", { ascending: true })
      .limit(limit);

    return ((data ?? []) as WeeklyMarketUpdate[]).map(mapDbRow);
  } catch {
    return [];
  }
}
