import {
  resolveWatchlistCategory,
  normalizeWatchlistCategory,
  type WatchlistCategory,
} from "@/lib/watchlist/categories";
import {
  buildMarketDataFields,
  buildPreviousDayMarket,
  enrichScannerRow,
  sortScannerRows,
} from "@/lib/watchlist/calculations";
import { resolveCategoryDisplayRank } from "@/lib/watchlist/watchlist-rank";
import { attachScoresToRows } from "@/lib/watchlist/scoring/map-row";
import {
  lastCompletedTradingDate,
  selectCompletedCandleDate,
} from "@/lib/market-calendar/nyse-calendar";
import type {
  PreviousTechnicalIndicatorFields,
  TechnicalIndicatorFields,
  WatchlistScannerData,
  WatchlistScannerRow,
} from "@/lib/watchlist/types";
import { getAggregatedIntelligenceImpacts } from "@/lib/supabase/queries/market-intelligence";
import type { AggregatedTickerIntelligence } from "@/lib/market-intelligence/types";
import { persistScannerScores } from "@/lib/supabase/queries/scanner-scores";
import { buildMockScannerRowsWithStore } from "@/lib/mock/watchlist-store";
import {
  buildMockScannerRow,
  getMockTechnicalSnapshot,
} from "@/lib/mock/watchlist-scanner";
import { readSupabasePrimary } from "@/lib/supabase/data-access";
import {
  resolveSupabaseReadUserId,
  withSupabaseQuery,
} from "@/lib/supabase/resolve-user";
import type {
  MarketData,
  SupportResistance,
  TechnicalIndicator,
  WatchlistItem,
} from "@/types/database";

function emptyTechnicals(): TechnicalIndicatorFields {
  return { atr14: 0, ema20: 0, sma50: 0, sma200: 0, stochastic: 0 };
}

function emptyPreviousTechnicals(): PreviousTechnicalIndicatorFields {
  return {
    atr14: null,
    ema20: null,
    sma50: null,
    sma200: null,
    stochastic: null,
  };
}

function mapSupportResistance(
  row: SupportResistance | null,
  watchlistId: string,
  timeframe: "daily" | "weekly"
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
      timeframe,
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
    normalizeWatchlistCategory(item.watchlist_category) ?? item.watchlist_category
  );
}

function withCategory(
  row: WatchlistScannerRow,
  item: WatchlistItem
): WatchlistScannerRow {
  return { ...row, category: categoryFromItem(item) };
}

function mapIndicatorRow(row: TechnicalIndicator): TechnicalIndicatorFields {
  return {
    atr14: row.atr_14 != null ? Number(row.atr_14) : 0,
    ema20: row.ema_20 != null ? Number(row.ema_20) : 0,
    sma50: row.sma_50 != null ? Number(row.sma_50) : 0,
    sma200: row.sma_200 != null ? Number(row.sma_200) : 0,
    stochastic: row.stochastic != null ? Number(row.stochastic) : 0,
  };
}

function mapPreviousIndicatorRow(
  row: TechnicalIndicator
): PreviousTechnicalIndicatorFields {
  return {
    atr14: row.atr_14 != null ? Number(row.atr_14) : 0,
    ema20: row.ema_20 != null ? Number(row.ema_20) : 0,
    sma50: row.sma_50 != null ? Number(row.sma_50) : 0,
    sma200: row.sma_200 != null ? Number(row.sma_200) : 0,
    stochastic: row.stochastic != null ? Number(row.stochastic) : 0,
  };
}

function resolveTechnicals(
  watchlistId: string,
  ticker: string,
  indicatorsByWatchlist: Map<string, TechnicalIndicator[]>,
  completedDate: string,
  allowMockFallback: boolean
): {
  today: TechnicalIndicatorFields;
  previous: PreviousTechnicalIndicatorFields;
} {
  const rows = (indicatorsByWatchlist.get(watchlistId) ?? []).filter(
    (r) => r.indicator_date <= completedDate
  );

  if (rows.length >= 2) {
    return {
      today: mapIndicatorRow(rows[0]!),
      previous: mapPreviousIndicatorRow(rows[1]!),
    };
  }
  if (rows.length === 1) {
    const today = mapIndicatorRow(rows[0]!);
    return { today, previous: { ...today } };
  }

  if (allowMockFallback) {
    return getMockTechnicalSnapshot(ticker);
  }

  return {
    today: emptyTechnicals(),
    previous: emptyPreviousTechnicals(),
  };
}

function pickCompletedCandles(
  marketRows: MarketData[],
  completedDate: string
): { latest: MarketData | null; previous: MarketData | null } {
  const sorted = [...marketRows]
    .filter((r) => r.price_date <= completedDate)
    .sort(
      (a, b) =>
        new Date(b.price_date).getTime() - new Date(a.price_date).getTime()
    );

  const availableDates = sorted.map((r) => r.price_date);
  const targetDate = selectCompletedCandleDate(availableDates);
  const latest =
    sorted.find((r) => r.price_date === targetDate) ?? sorted[0] ?? null;

  if (!latest) return { latest: null, previous: null };

  const previous =
    sorted.find((r) => r.price_date < latest.price_date) ?? null;

  return { latest, previous };
}

function buildRowFromDb(
  item: WatchlistItem,
  marketRows: MarketData[],
  dailySr: SupportResistance | null,
  weeklySr: SupportResistance | null,
  indicatorsByWatchlist: Map<string, TechnicalIndicator[]>,
  completedDate: string
): WatchlistScannerRow {
  const category = categoryFromItem(item);
  const priorityRank = resolveCategoryDisplayRank(
    item.ticker,
    category,
    item.priority_rank ?? 0
  );
  const { latest, previous } = pickCompletedCandles(marketRows, completedDate);

  const { today: technicals, previous: previousTechnicals } = resolveTechnicals(
    item.id,
    item.ticker,
    indicatorsByWatchlist,
    completedDate,
    false
  );

  const dailySupportResistance = mapSupportResistance(
    dailySr,
    item.id,
    "daily"
  );
  const weeklySupportResistance = weeklySr
    ? mapSupportResistance(weeklySr, item.id, "weekly")
    : null;

  if (latest) {
    const close = Number(latest.close);
    const previousClose = previous ? Number(previous.close) : close;
    const high = Number(latest.high ?? close);
    const low = Number(latest.low ?? close);
    const open = Number(latest.open ?? close);

    const market = buildMarketDataFields(
      open,
      high,
      low,
      close,
      previousClose,
      close
    );

    const prevHigh = previous
      ? Number(previous.high ?? previousClose)
      : low;
    const prevLow = previous ? Number(previous.low ?? previousClose) : low;

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
        dailySupportResistance,
        category,
        weeklySupportResistance,
        priorityRank,
        item.notes,
        item.is_active
      ),
      item
    );
  }

  return buildMockScannerRow(
    item.ticker,
    item.sort_order,
    item.id,
    category,
    priorityRank
  );
}

function groupIndicatorsByWatchlist(
  rows: TechnicalIndicator[]
): Map<string, TechnicalIndicator[]> {
  const map = new Map<string, TechnicalIndicator[]>();
  for (const row of rows) {
    const existing = map.get(row.watchlist_id) ?? [];
    existing.push(row);
    map.set(row.watchlist_id, existing);
  }
  for (const [id, list] of map) {
    map.set(
      id,
      list.sort(
        (a, b) =>
          new Date(b.indicator_date).getTime() -
          new Date(a.indicator_date).getTime()
      )
    );
  }
  return map;
}

function groupSupportResistance(
  rows: SupportResistance[]
): {
  daily: Map<string, SupportResistance>;
  weekly: Map<string, SupportResistance>;
} {
  const daily = new Map<string, SupportResistance>();
  const weekly = new Map<string, SupportResistance>();
  for (const row of rows) {
    if (row.timeframe === "weekly") {
      weekly.set(row.watchlist_id, row);
    } else {
      daily.set(row.watchlist_id, row);
    }
  }
  return { daily, weekly };
}

async function fetchFromSupabaseForUser(
  userId: string,
  supabase: import("@supabase/supabase-js").SupabaseClient<import("@/types/database").Database>
): Promise<WatchlistScannerRow[]> {
  const completedDate = lastCompletedTradingDate();

  const { data: watchlistItems, error } = await supabase
    .from("watchlist")
    .select("*")
    .eq("user_id", userId)
    .eq("is_active", true)
    .order("watchlist_category", { ascending: true })
    .order("priority_rank", { ascending: true })
    .order("sort_order", { ascending: true });

  if (error) return [];

  const items = (watchlistItems ?? []) as WatchlistItem[];
  if (items.length === 0) return [];

  const watchlistIds = items.map((i) => i.id);

  const [marketRes, srRes, techRes] = await Promise.all([
    supabase
      .from("market_data")
      .select("*")
      .in("watchlist_id", watchlistIds)
      .order("price_date", { ascending: false }),
    supabase
      .from("support_resistance")
      .select("*")
      .in("watchlist_id", watchlistIds),
    supabase
      .from("technical_indicators")
      .select("*")
      .eq("user_id", userId)
      .in("watchlist_id", watchlistIds)
      .order("indicator_date", { ascending: false }),
  ]);

  const marketByWatchlist = new Map<string, MarketData[]>();
  for (const row of (marketRes.data ?? []) as MarketData[]) {
    const existing = marketByWatchlist.get(row.watchlist_id) ?? [];
    existing.push(row);
    marketByWatchlist.set(row.watchlist_id, existing);
  }

  const { daily: dailySr, weekly: weeklySr } = groupSupportResistance(
    (srRes.data ?? []) as SupportResistance[]
  );

  const indicatorsByWatchlist = groupIndicatorsByWatchlist(
    (techRes.data ?? []) as TechnicalIndicator[]
  );

  return sortScannerRows(
    items.map((item) =>
      buildRowFromDb(
        item,
        marketByWatchlist.get(item.id) ?? [],
        dailySr.get(item.id) ?? null,
        weeklySr.get(item.id) ?? null,
        indicatorsByWatchlist,
        completedDate
      )
    )
  );
}

async function fetchFromSupabase(_userId: string): Promise<WatchlistScannerRow[]> {
  return withSupabaseQuery(
    async ({ userId, supabase }) =>
      fetchFromSupabaseForUser(userId, supabase),
    () => []
  );
}

export type WatchlistScannerQueryOptions = {
  /** Persist recomputed scores to Supabase. Off by default for read-only page loads. */
  persistScores?: boolean;
  /** Reuse a preloaded intelligence map to avoid duplicate Supabase reads. */
  intelligenceMap?: Map<string, AggregatedTickerIntelligence>;
};

async function finalizeScannerRows(
  rows: WatchlistScannerRow[],
  dataSource: "supabase" | "mock",
  userId?: string,
  options: WatchlistScannerQueryOptions = {}
): Promise<WatchlistScannerData> {
  const intelligenceMap =
    options.intelligenceMap ?? (await getAggregatedIntelligenceImpacts());
  const scored = attachScoresToRows(rows, intelligenceMap);

  if (options.persistScores && dataSource === "supabase" && userId) {
    await persistScannerScores(
      scored.map((r) => r.score!).filter(Boolean),
      userId
    );
  }

  return { rows: scored, dataSource };
}

export async function getWatchlistScannerData(
  options: WatchlistScannerQueryOptions = {}
): Promise<WatchlistScannerData> {
  const { value: rows, dataSource } = await readSupabasePrimary({
    module: "getWatchlistScannerData",
    mock: () => buildMockScannerRowsWithStore(),
    empty: () => [],
    read: fetchFromSupabase,
  });

  const userId =
    dataSource === "supabase" ? await resolveSupabaseReadUserId() : undefined;
  return finalizeScannerRows(rows, dataSource, userId ?? undefined, options);
}

export async function getWatchlistScannerDataForUser(
  userId: string,
  supabase: import("@supabase/supabase-js").SupabaseClient<import("@/types/database").Database>,
  options: WatchlistScannerQueryOptions = { persistScores: true }
): Promise<WatchlistScannerData> {
  const rows = await fetchFromSupabaseForUser(userId, supabase);
  return finalizeScannerRows(rows, "supabase", userId, options);
}

export { lastCompletedTradingDate };
