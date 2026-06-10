import { randomUUID } from "crypto";
import type { SupabaseClient } from "@supabase/supabase-js";
import { calculateAveragePrice } from "@/lib/watchlist/average-price";
import {
  computeIndicatorsFromCandles,
  computePreviousSma50,
  buildStochasticDebug,
} from "@/lib/watchlist/compute-indicators";
import { MarketDataFetchError } from "@/lib/watchlist/market-data-fetch-error";
import {
  fetchDailyCandlesForTicker,
  type MarketDataFetchSource,
} from "@/lib/watchlist/market-data-provider";
import { getWatchlistHistoryRange } from "@/lib/watchlist/market-data-sync-range";
import { resolveWatchlistSyncClient } from "@/lib/watchlist/ensure-default-watchlist";
import {
  MARKET_DATA_UPSERT_BATCH_SIZE,
  WATCHLIST_TICKER_CONCURRENCY,
} from "@/lib/watchlist/sync-concurrency";
import { isSupabaseConfigured } from "@/lib/supabase/is-configured";
import type { Database, MarketData, TechnicalIndicator, WatchlistItem } from "@/types/database";

export interface TickerSyncDiagnostic {
  symbol: string;
  selectedSource: MarketDataFetchSource | null;
  status: "success" | "failed";
  error: string | null;
  fmpError: string | null;
  yahooError: string | null;
}

export interface SyncWatchlistDataResult {
  completedCandleDate: string;
  marketRowsUpserted: number;
  indicatorRowsUpserted: number;
  tickersProcessed: number;
  tickersFailed: number;
  errors: string[];
  providerSource: "fmp" | "yahoo" | "mixed" | "mock" | "none";
  fmpTickers: number;
  yahooTickers: number;
  tickerDiagnostics: TickerSyncDiagnostic[];
}

type DbClient = SupabaseClient<Database>;

interface TickerSyncOutcome {
  symbol: string;
  marketRows: number;
  indicatorRows: number;
  source: MarketDataFetchSource | null;
  diagnostic: TickerSyncDiagnostic;
  fmpCounted: boolean;
  yahooCounted: boolean;
}

function isMissingOptionalColumnError(message: string): boolean {
  return /average_price|fetched_at|schema cache|column/i.test(message);
}

async function resolveClient(supabase?: DbClient): Promise<DbClient> {
  return resolveWatchlistSyncClient(supabase);
}

async function fetchActiveWatchlist(
  userId: string,
  supabase?: DbClient
): Promise<WatchlistItem[]> {
  const client = await resolveClient(supabase);
  const { data, error } = await client
    .from("watchlist")
    .select("*")
    .eq("user_id", userId)
    .eq("is_active", true)
    .order("sort_order", { ascending: true });

  if (error) throw new Error(error.message);
  return (data ?? []) as WatchlistItem[];
}

async function upsertHistoricalMarketDataBulk(
  item: WatchlistItem,
  candles: { date: string; open: number; high: number; low: number; close: number; volume: number | null }[],
  source: string,
  completedDate: string,
  supabase?: DbClient
): Promise<number> {
  const client = await resolveClient(supabase);
  const toStore = candles.filter((c) => c.date <= completedDate).slice(-260);
  if (toStore.length === 0) return 0;

  const dates = toStore.map((c) => c.date);
  const { data: existingRows } = await client
    .from("market_data")
    .select("id, price_date, created_at")
    .eq("watchlist_id", item.id)
    .in("price_date", dates);

  const existingByDate = new Map(
    (existingRows ?? []).map((r) => {
      const row = r as { id: string; price_date: string; created_at: string };
      return [row.price_date, row] as const;
    })
  );

  const now = new Date().toISOString();
  const payloads = toStore.map((candle) => {
    const existing = existingByDate.get(candle.date);
    return {
      id: existing?.id ?? randomUUID(),
      watchlist_id: item.id,
      ticker: item.ticker.toUpperCase(),
      price_date: candle.date,
      open: candle.open,
      high: candle.high,
      low: candle.low,
      close: candle.close,
      volume: candle.volume,
      source,
      average_price: calculateAveragePrice(candle.high, candle.low),
      fetched_at: now,
      updated_at: now,
      created_at: existing?.created_at ?? now,
    };
  });

  for (let i = 0; i < payloads.length; i += MARKET_DATA_UPSERT_BATCH_SIZE) {
    const chunk = payloads.slice(i, i + MARKET_DATA_UPSERT_BATCH_SIZE);
    let { error } = await client
      .from("market_data")
      .upsert(chunk as never, { onConflict: "watchlist_id,price_date" });

    if (error && isMissingOptionalColumnError(error.message)) {
      const coreChunk = chunk.map(
        ({ average_price: _ap, fetched_at: _fa, ...rest }) => rest
      );
      ({ error } = await client
        .from("market_data")
        .upsert(coreChunk as never, { onConflict: "watchlist_id,price_date" }));
    }

    if (error) throw new Error(error.message);
  }

  return toStore.length;
}

async function upsertIndicatorRow(
  userId: string,
  item: WatchlistItem,
  indicatorDate: string,
  values: {
    ema20: number;
    sma50: number;
    sma200: number;
    atr14: number;
    stochastic: number;
  },
  source: string,
  supabase?: DbClient
): Promise<void> {
  const client = await resolveClient(supabase);
  const { data: existing } = await client
    .from("technical_indicators")
    .select("id, created_at")
    .eq("watchlist_id", item.id)
    .eq("indicator_date", indicatorDate)
    .maybeSingle();

  const now = new Date().toISOString();
  const payload: TechnicalIndicator = {
    id: existing ? (existing as { id: string }).id : randomUUID(),
    user_id: userId,
    watchlist_id: item.id,
    ticker: item.ticker.toUpperCase(),
    indicator_date: indicatorDate,
    atr_14: values.atr14,
    ema_20: values.ema20,
    sma_50: values.sma50,
    sma_200: values.sma200,
    stochastic: values.stochastic,
    source,
    refreshed_at: now,
    created_at: existing
      ? (existing as { created_at: string }).created_at
      : now,
    updated_at: now,
  };

  const { error } = await client
    .from("technical_indicators")
    .upsert(payload as never, { onConflict: "watchlist_id,indicator_date" });

  if (error) throw new Error(error.message);
}

async function syncSingleWatchlistItem(
  userId: string,
  item: WatchlistItem,
  from: string,
  to: string,
  completedCandleDate: string,
  supabase?: DbClient
): Promise<TickerSyncOutcome> {
  const symbol = item.ticker.toUpperCase();
  console.log(`[watchlist-sync] Processing ticker ${symbol}...`);

  try {
    const { candles, source, fmpError, yahooError } =
      await fetchDailyCandlesForTicker(item.ticker, from, to);

    const eligible = candles.filter((c) => c.date <= completedCandleDate);
    if (eligible.length === 0) {
      throw new Error(`No completed candles through ${completedCandleDate}`);
    }

    const marketRows = await upsertHistoricalMarketDataBulk(
      item,
      eligible,
      source,
      completedCandleDate,
      supabase
    );

    const indicators = computeIndicatorsFromCandles(eligible);
    if (!indicators) {
      throw new Error("Insufficient candle history for indicator calculation");
    }

    await upsertIndicatorRow(
      userId,
      item,
      completedCandleDate,
      indicators,
      "computed",
      supabase
    );
    let indicatorRows = 1;

    const soDebug = buildStochasticDebug(eligible, symbol);
    if (soDebug) {
      console.log(
        `[watchlist-sync] ${symbol} SO debug: length=${soDebug.soLength} smooth=${soDebug.soSmoothing} close=${soDebug.close} rawHigh=${soDebug.rawHigh} rawLow=${soDebug.rawLow} rawK=${soDebug.rawK.toFixed(2)} so=${soDebug.soValue.toFixed(2)} date=${soDebug.candleDate}`
      );
    }

    const prevDate = eligible[eligible.length - 2]?.date;
    if (prevDate) {
      const prevIndicators = computeIndicatorsFromCandles(eligible.slice(0, -1));
      if (prevIndicators) {
        await upsertIndicatorRow(
          userId,
          item,
          prevDate,
          prevIndicators,
          "computed",
          supabase
        );
        indicatorRows++;
      }
    }

    console.log(
      `[watchlist-sync] Completed ${symbol} (${marketRows} candles, source=${source})`
    );

    return {
      symbol,
      marketRows,
      indicatorRows,
      source,
      fmpCounted: source === "fmp",
      yahooCounted: source === "yahoo",
      diagnostic: {
        symbol,
        selectedSource: source,
        status: "success",
        error: null,
        fmpError,
        yahooError,
      },
    };
  } catch (e) {
    let fmpError: string | null = null;
    let yahooError: string | null = null;
    let message: string;

    if (e instanceof MarketDataFetchError) {
      fmpError = e.fmpError;
      yahooError = e.yahooError;
      message = e.message;
    } else {
      message = `${symbol}: ${e instanceof Error ? e.message : "sync failed"}`;
    }

    console.error(`[watchlist-sync] Failed ${symbol}: ${message}`);

    return {
      symbol,
      marketRows: 0,
      indicatorRows: 0,
      source: null,
      fmpCounted: false,
      yahooCounted: false,
      diagnostic: {
        symbol,
        selectedSource: null,
        status: "failed",
        error: message,
        fmpError,
        yahooError,
      },
    };
  }
}

async function mapWithConcurrency<T, R>(
  items: T[],
  limit: number,
  fn: (item: T, index: number) => Promise<R>
): Promise<R[]> {
  const results: R[] = new Array(items.length);
  let nextIndex = 0;

  async function worker() {
    while (nextIndex < items.length) {
      const index = nextIndex++;
      results[index] = await fn(items[index]!, index);
    }
  }

  const workers = Array.from(
    { length: Math.min(limit, items.length) },
    () => worker()
  );
  await Promise.all(workers);
  return results;
}

export async function syncWatchlistDataForUser(
  userId: string,
  now: Date = new Date(),
  supabase?: DbClient
): Promise<SyncWatchlistDataResult> {
  if (!isSupabaseConfigured()) {
    throw new Error("Supabase is required for watchlist data engine sync.");
  }

  const { completedCandleDate, from, to } = getWatchlistHistoryRange(now);
  const items = await fetchActiveWatchlist(userId, supabase);

  console.log(
    `[watchlist-sync] Starting sync for ${items.length} tickers (concurrency=${WATCHLIST_TICKER_CONCURRENCY})`
  );

  const outcomes = await mapWithConcurrency(
    items,
    WATCHLIST_TICKER_CONCURRENCY,
    (item) =>
      syncSingleWatchlistItem(
        userId,
        item,
        from,
        to,
        completedCandleDate,
        supabase
      )
  );

  let marketRowsUpserted = 0;
  let indicatorRowsUpserted = 0;
  let tickersFailed = 0;
  const errors: string[] = [];
  const tickerDiagnostics: TickerSyncDiagnostic[] = [];
  let fmpTickers = 0;
  let yahooTickers = 0;

  for (const outcome of outcomes) {
    marketRowsUpserted += outcome.marketRows;
    indicatorRowsUpserted += outcome.indicatorRows;
    tickerDiagnostics.push(outcome.diagnostic);

    if (outcome.diagnostic.status === "failed") {
      tickersFailed++;
      if (outcome.diagnostic.error) errors.push(outcome.diagnostic.error);
    }
    if (outcome.fmpCounted) fmpTickers++;
    if (outcome.yahooCounted) yahooTickers++;
  }

  let providerSource: SyncWatchlistDataResult["providerSource"] = "none";
  if (fmpTickers > 0 && yahooTickers > 0) providerSource = "mixed";
  else if (fmpTickers > 0) providerSource = "fmp";
  else if (yahooTickers > 0) providerSource = "yahoo";

  console.log(
    `[watchlist-sync] Finished: ${items.length - tickersFailed}/${items.length} succeeded, ${marketRowsUpserted} candle rows, ${tickersFailed} failed`
  );

  return {
    completedCandleDate,
    marketRowsUpserted,
    indicatorRowsUpserted,
    tickersProcessed: items.length,
    tickersFailed,
    errors,
    providerSource,
    fmpTickers,
    yahooTickers,
    tickerDiagnostics,
  };
}

export async function listMarketDataForWatchlistIds(
  watchlistIds: string[],
  supabase?: DbClient
): Promise<Map<string, MarketData[]>> {
  const map = new Map<string, MarketData[]>();
  if (watchlistIds.length === 0) return map;

  const client = await resolveClient(supabase);
  const { data, error } = await client
    .from("market_data")
    .select("*")
    .in("watchlist_id", watchlistIds)
    .order("price_date", { ascending: false });

  if (error) return map;

  for (const row of (data ?? []) as MarketData[]) {
    const existing = map.get(row.watchlist_id) ?? [];
    existing.push(row);
    map.set(row.watchlist_id, existing);
  }
  return map;
}

export { computePreviousSma50 };
