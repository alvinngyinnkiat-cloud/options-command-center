import { randomUUID } from "crypto";
import type { SupabaseClient } from "@supabase/supabase-js";
import { calculateAveragePrice } from "@/lib/watchlist/average-price";
import {
  computeIndicatorsFromCandles,
  computePreviousSma50,
} from "@/lib/watchlist/compute-indicators";
import { MarketDataFetchError } from "@/lib/watchlist/market-data-fetch-error";
import {
  fetchDailyCandlesForTicker,
  type MarketDataFetchSource,
} from "@/lib/watchlist/market-data-provider";
import { getWatchlistHistoryRange } from "@/lib/watchlist/market-data-sync-range";
import { resolveWatchlistSyncClient } from "@/lib/watchlist/ensure-default-watchlist";
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

function isMissingOptionalColumnError(message: string): boolean {
  return /average_price|fetched_at|schema cache|column/i.test(message);
}

async function resolveClient(
  supabase?: DbClient
): Promise<DbClient> {
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

async function upsertMarketDataRow(
  item: WatchlistItem,
  candle: {
    date: string;
    open: number;
    high: number;
    low: number;
    close: number;
    volume: number | null;
  },
  source: string,
  supabase?: DbClient
): Promise<void> {
  const client = await resolveClient(supabase);
  const { data: existing } = await client
    .from("market_data")
    .select("id, created_at")
    .eq("watchlist_id", item.id)
    .eq("price_date", candle.date)
    .maybeSingle();

  const now = new Date().toISOString();
  const corePayload = {
    id: existing ? (existing as { id: string }).id : randomUUID(),
    watchlist_id: item.id,
    ticker: item.ticker.toUpperCase(),
    price_date: candle.date,
    open: candle.open,
    high: candle.high,
    low: candle.low,
    close: candle.close,
    volume: candle.volume,
    source,
    updated_at: now,
    created_at: existing
      ? (existing as { created_at: string }).created_at
      : now,
  };

  const extendedPayload = {
    ...corePayload,
    average_price: calculateAveragePrice(candle.high, candle.low),
    fetched_at: now,
  };

  let { error } = await client
    .from("market_data")
    .upsert(extendedPayload as never, { onConflict: "watchlist_id,price_date" });

  if (error && isMissingOptionalColumnError(error.message)) {
    ({ error } = await client
      .from("market_data")
      .upsert(corePayload as never, { onConflict: "watchlist_id,price_date" }));
  }

  if (error) throw new Error(error.message);
}

async function upsertHistoricalMarketData(
  item: WatchlistItem,
  candles: Awaited<ReturnType<typeof fetchDailyCandlesForTicker>>["candles"],
  source: string,
  completedDate: string,
  supabase?: DbClient
): Promise<number> {
  let count = 0;
  const toStore = candles.filter((c) => c.date <= completedDate).slice(-260);

  for (const candle of toStore) {
    await upsertMarketDataRow(item, candle, source, supabase);
    count++;
  }
  return count;
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
  let marketRowsUpserted = 0;
  let indicatorRowsUpserted = 0;
  let tickersFailed = 0;
  const errors: string[] = [];
  const tickerDiagnostics: TickerSyncDiagnostic[] = [];
  let providerSource: SyncWatchlistDataResult["providerSource"] = "none";
  let fmpTickers = 0;
  let yahooTickers = 0;

  for (const item of items) {
    const symbol = item.ticker.toUpperCase();
    try {
      const { candles, source, fmpError, yahooError } =
        await fetchDailyCandlesForTicker(item.ticker, from, to);
      if (source === "fmp") fmpTickers++;
      else if (source === "yahoo") yahooTickers++;

      const eligible = candles.filter((c) => c.date <= completedCandleDate);
      if (eligible.length === 0) {
        throw new Error(`No completed candles through ${completedCandleDate}`);
      }

      marketRowsUpserted += await upsertHistoricalMarketData(
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
      indicatorRowsUpserted++;

      const prevDate = eligible[eligible.length - 2]?.date;
      if (prevDate) {
        const prevIndicators = computeIndicatorsFromCandles(
          eligible.slice(0, -1)
        );
        if (prevIndicators) {
          await upsertIndicatorRow(
            userId,
            item,
            prevDate,
            prevIndicators,
            "computed",
            supabase
          );
          indicatorRowsUpserted++;
        }
      }

      tickerDiagnostics.push({
        symbol,
        selectedSource: source,
        status: "success",
        error: null,
        fmpError,
        yahooError,
      });
    } catch (e) {
      tickersFailed++;
      let fmpError: string | null = null;
      let yahooError: string | null = null;
      let message: string;

      if (e instanceof MarketDataFetchError) {
        fmpError = e.fmpError;
        yahooError = e.yahooError;
        message = e.message;
        errors.push(message);
      } else {
        message = `${symbol}: ${e instanceof Error ? e.message : "sync failed"}`;
        errors.push(message);
      }

      tickerDiagnostics.push({
        symbol,
        selectedSource: null,
        status: "failed",
        error: message,
        fmpError,
        yahooError,
      });
    }
  }

  if (fmpTickers > 0 && yahooTickers > 0) providerSource = "mixed";
  else if (fmpTickers > 0) providerSource = "fmp";
  else if (yahooTickers > 0) providerSource = "yahoo";

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
