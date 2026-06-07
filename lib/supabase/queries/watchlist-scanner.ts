import {
  resolveWatchlistCategory,
  type WatchlistCategory,
} from "@/lib/watchlist/categories";
import {
  buildMarketDataFields,
  buildPreviousDayMarket,
  enrichScannerRow,
  sortScannerRows,
} from "@/lib/watchlist/calculations";
import { attachScoresToRows } from "@/lib/watchlist/scoring/map-row";
import type { WatchlistScannerData, WatchlistScannerRow } from "@/lib/watchlist/types";
import { getAggregatedIntelligenceImpacts } from "@/lib/supabase/queries/market-intelligence";
import { persistScannerScores } from "@/lib/supabase/queries/scanner-scores";
import { buildMockScannerRowsWithStore } from "@/lib/mock/watchlist-store";
import {
  buildMockScannerRow,
  getMockTechnicalSnapshot,
} from "@/lib/mock/watchlist-scanner";
import { isSupabaseConfigured } from "@/lib/supabase/is-configured";
import { createClient } from "@/lib/supabase/server";
import type {
  MarketData,
  SupportResistance,
  WatchlistItem,
} from "@/types/database";

function mapSupportResistance(
  row: SupportResistance | null,
  watchlistId: string
): WatchlistScannerRow["supportResistance"] {
  if (!row) {
    return {
      id: null,
      watchlistId,
      support1: null,
      support2: null,
      resistance1: null,
      resistance2: null,
      notes: null,
      updateDate: new Date().toISOString().split("T")[0],
      timeframe: "daily",
    };
  }

  return {
    id: row.id,
    watchlistId: row.watchlist_id,
    support1: row.support_1 != null ? Number(row.support_1) : null,
    support2: row.support_2 != null ? Number(row.support_2) : null,
    resistance1: row.resistance_1 != null ? Number(row.resistance_1) : null,
    resistance2: row.resistance_2 != null ? Number(row.resistance_2) : null,
    notes: row.notes,
    updateDate: row.update_date,
    timeframe: row.timeframe,
  };
}

function categoryFromItem(item: WatchlistItem): WatchlistCategory {
  return resolveWatchlistCategory(
    item.ticker,
    item.watchlist_category as WatchlistCategory
  );
}

function withCategory(
  row: WatchlistScannerRow,
  item: WatchlistItem
): WatchlistScannerRow {
  return { ...row, category: categoryFromItem(item) };
}

function buildRowFromDb(
  item: WatchlistItem,
  marketRows: MarketData[],
  srRow: SupportResistance | null
): WatchlistScannerRow {
  const category = categoryFromItem(item);
  const sorted = [...marketRows].sort(
    (a, b) => new Date(b.price_date).getTime() - new Date(a.price_date).getTime()
  );
  const latest = sorted[0];
  const previous = sorted[1];

  const { today: technicals, previous: previousTechnicals } =
    getMockTechnicalSnapshot(item.ticker);

  if (latest) {
    const close = Number(latest.close);
    const previousClose = previous ? Number(previous.close) : close * 0.995;
    const high = Number(latest.high ?? close);
    const low = Number(latest.low ?? close);

    const market = buildMarketDataFields(
      Number(latest.open ?? close),
      high,
      low,
      close,
      previousClose,
      close
    );

    const mockPrev = buildMockScannerRow(item.ticker, item.sort_order, item.id)
      .previousMarket;
    const prevHigh = previous
      ? Number(previous.high ?? previousClose * 1.005)
      : mockPrev.high;
    const prevLow = previous
      ? Number(previous.low ?? previousClose * 0.995)
      : mockPrev.low;

    const previousMarket = buildPreviousDayMarket(prevHigh, prevLow);

    return withCategory(
      enrichScannerRow(
        item.id,
        item.ticker,
        item.sort_order,
        market,
        previousMarket,
        technicals,
        previousTechnicals,
        mapSupportResistance(srRow, item.id)
      ),
      item
    );
  }

  return buildMockScannerRow(
    item.ticker,
    item.sort_order,
    item.id,
    category
  );
}

async function fetchFromSupabase(userId: string): Promise<WatchlistScannerRow[] | null> {
  const supabase = await createClient();

  const { data: watchlistItems, error } = await supabase
    .from("watchlist")
    .select("*")
    .eq("user_id", userId)
    .eq("is_active", true)
    .order("sort_order", { ascending: true });

  if (error) return null;

  const items = (watchlistItems ?? []) as WatchlistItem[];
  if (items.length === 0) return null;

  const watchlistIds = items.map((i) => i.id);

  const [marketRes, srRes] = await Promise.all([
    supabase
      .from("market_data")
      .select("*")
      .in("watchlist_id", watchlistIds)
      .order("price_date", { ascending: false }),
    supabase
      .from("support_resistance")
      .select("*")
      .in("watchlist_id", watchlistIds)
      .eq("timeframe", "daily"),
  ]);

  const marketByWatchlist = new Map<string, MarketData[]>();
  for (const row of (marketRes.data ?? []) as MarketData[]) {
    const existing = marketByWatchlist.get(row.watchlist_id) ?? [];
    existing.push(row);
    marketByWatchlist.set(row.watchlist_id, existing);
  }

  const srByWatchlist = new Map<string, SupportResistance>();
  for (const row of (srRes.data ?? []) as SupportResistance[]) {
    srByWatchlist.set(row.watchlist_id, row);
  }

  return sortScannerRows(
    items.map((item) =>
      buildRowFromDb(
        item,
        marketByWatchlist.get(item.id) ?? [],
        srByWatchlist.get(item.id) ?? null
      )
    )
  );
}

async function finalizeScannerRows(
  rows: WatchlistScannerRow[],
  dataSource: "supabase" | "mock",
  userId?: string
): Promise<WatchlistScannerData> {
  const intelligenceMap = await getAggregatedIntelligenceImpacts();
  const scored = attachScoresToRows(rows, intelligenceMap);

  if (dataSource === "supabase" && userId) {
    await persistScannerScores(
      scored.map((r) => r.score!).filter(Boolean),
      userId
    );
  }

  return { rows: scored, dataSource };
}

export async function getWatchlistScannerData(): Promise<WatchlistScannerData> {
  if (!isSupabaseConfigured()) {
    return finalizeScannerRows(buildMockScannerRowsWithStore(), "mock");
  }

  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return finalizeScannerRows(buildMockScannerRowsWithStore(), "mock");
    }

    const rows = await fetchFromSupabase(user.id);
    if (!rows || rows.length === 0) {
      return finalizeScannerRows(buildMockScannerRowsWithStore(), "mock");
    }

    return finalizeScannerRows(rows, "supabase", user.id);
  } catch {
    return finalizeScannerRows(buildMockScannerRowsWithStore(), "mock");
  }
}
