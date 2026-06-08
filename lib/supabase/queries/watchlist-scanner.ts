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
import type {
  PreviousTechnicalIndicatorFields,
  TechnicalIndicatorFields,
  WatchlistScannerData,
  WatchlistScannerRow,
} from "@/lib/watchlist/types";
import { getAggregatedIntelligenceImpacts } from "@/lib/supabase/queries/market-intelligence";
import { persistScannerScores } from "@/lib/supabase/queries/scanner-scores";
import { buildMockScannerRowsWithStore } from "@/lib/mock/watchlist-store";
import {
  buildMockScannerRow,
  getMockTechnicalSnapshot,
} from "@/lib/mock/watchlist-scanner";
import { readSupabasePrimary } from "@/lib/supabase/data-access";
import { resolveAuthenticatedUserId, withSupabaseQuery } from "@/lib/supabase/resolve-user";
import type {
  MarketData,
  SupportResistance,
  TechnicalIndicator,
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
  indicatorsByWatchlist: Map<string, TechnicalIndicator[]>
): {
  today: TechnicalIndicatorFields;
  previous: PreviousTechnicalIndicatorFields;
} {
  const rows = indicatorsByWatchlist.get(watchlistId) ?? [];
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
  return getMockTechnicalSnapshot(ticker);
}

function buildRowFromDb(
  item: WatchlistItem,
  marketRows: MarketData[],
  srRow: SupportResistance | null,
  indicatorsByWatchlist: Map<string, TechnicalIndicator[]>
): WatchlistScannerRow {
  const category = categoryFromItem(item);
  const sorted = [...marketRows].sort(
    (a, b) => new Date(b.price_date).getTime() - new Date(a.price_date).getTime()
  );
  const latest = sorted[0];
  const previous = sorted[1];

  const { today: technicals, previous: previousTechnicals } = resolveTechnicals(
    item.id,
    item.ticker,
    indicatorsByWatchlist
  );

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

async function fetchFromSupabase(_userId: string): Promise<WatchlistScannerRow[]> {
  return withSupabaseQuery(
    async ({ userId, supabase }) => {
      const { data: watchlistItems, error } = await supabase
        .from("watchlist")
        .select("*")
        .eq("user_id", userId)
        .eq("is_active", true)
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
          .in("watchlist_id", watchlistIds)
          .eq("timeframe", "daily"),
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

      const srByWatchlist = new Map<string, SupportResistance>();
      for (const row of (srRes.data ?? []) as SupportResistance[]) {
        srByWatchlist.set(row.watchlist_id, row);
      }

      const indicatorsByWatchlist = groupIndicatorsByWatchlist(
        (techRes.data ?? []) as TechnicalIndicator[]
      );

      return sortScannerRows(
        items.map((item) =>
          buildRowFromDb(
            item,
            marketByWatchlist.get(item.id) ?? [],
            srByWatchlist.get(item.id) ?? null,
            indicatorsByWatchlist
          )
        )
      );
    },
    () => []
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
  const { value: rows, dataSource } = await readSupabasePrimary({
    module: "getWatchlistScannerData",
    mock: () => buildMockScannerRowsWithStore(),
    empty: () => [],
    read: fetchFromSupabase,
  });

  const userId =
    dataSource === "supabase" ? await resolveAuthenticatedUserId() : undefined;
  return finalizeScannerRows(rows, dataSource, userId);
}
