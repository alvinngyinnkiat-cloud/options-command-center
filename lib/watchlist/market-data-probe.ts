import { calculateAveragePrice } from "@/lib/watchlist/average-price";
import {
  lastCompletedTradingDate,
  selectCompletedCandleDate,
} from "@/lib/market-calendar/nyse-calendar";
import { MarketDataFetchError } from "@/lib/watchlist/market-data-fetch-error";
import {
  fetchDailyCandlesForTicker,
  getActiveMarketDataProvider,
  type DailyCandle,
  type MarketDataFetchSource,
} from "@/lib/watchlist/market-data-provider";
import { getWatchlistHistoryRange } from "@/lib/watchlist/market-data-sync-range";
import { yahooMarketDataProvider } from "@/lib/watchlist/yahoo-market-data-provider";

export type ProviderProbeStatus = "ok" | "failed" | "skipped";

export interface TickerMarketDataProbeResult {
  symbol: string;
  fmpStatus: ProviderProbeStatus;
  fmpError: string | null;
  yahooStatus: ProviderProbeStatus;
  yahooError: string | null;
  selectedSource: MarketDataFetchSource | null;
  candleDate: string | null;
  high: number | null;
  low: number | null;
  averagePrice: number | null;
  finalStatus: "ok" | "failed";
  error: string | null;
}

export const MARKET_DATA_TEST_SYMBOLS = [
  "QQQ",
  "IWM",
  "GLD",
  "XSP",
  "GOOG",
  "GOOGL",
  "AVGO",
  "NVDA",
  "SPY",
] as const;

function pickCompletedCandle(
  candles: DailyCandle[],
  now: Date
): DailyCandle | null {
  const dates = candles.map((c) => c.date);
  const targetDate = selectCompletedCandleDate(dates, now);
  return (
    candles.find((c) => c.date === targetDate) ??
    candles.filter((c) => c.date <= lastCompletedTradingDate(now)).at(-1) ??
    null
  );
}

function classifyFmpProbe(
  fmpError: string | null,
  hasCandle: boolean
): ProviderProbeStatus {
  if (hasCandle) return "ok";
  if (!getActiveMarketDataProvider()) return "skipped";
  return fmpError ? "failed" : "skipped";
}

function classifyYahooProbe(
  yahooError: string | null,
  hasCandle: boolean
): ProviderProbeStatus {
  if (hasCandle) return "ok";
  return yahooError ? "failed" : "skipped";
}

function probeResultFromCandle(
  symbol: string,
  fmpStatus: ProviderProbeStatus,
  fmpError: string | null,
  yahooStatus: ProviderProbeStatus,
  yahooError: string | null,
  source: MarketDataFetchSource | null,
  candle: DailyCandle | null
): TickerMarketDataProbeResult {
  if (!candle || source == null) {
    const error =
      [fmpError && `FMP: ${fmpError}`, yahooError && `Yahoo: ${yahooError}`]
        .filter(Boolean)
        .join(" | ") || `No completed candle for ${symbol}`;

    return {
      symbol,
      fmpStatus,
      fmpError,
      yahooStatus,
      yahooError,
      selectedSource: null,
      candleDate: null,
      high: null,
      low: null,
      averagePrice: null,
      finalStatus: "failed",
      error,
    };
  }

  return {
    symbol,
    fmpStatus,
    fmpError,
    yahooStatus,
    yahooError,
    selectedSource: source,
    candleDate: candle.date,
    high: candle.high,
    low: candle.low,
    averagePrice: calculateAveragePrice(candle.high, candle.low),
    finalStatus: "ok",
    error: null,
  };
}

/**
 * Probe a ticker using the same fetch path as Refresh Market Data / cron sync.
 * Also records individual FMP/Yahoo outcomes for diagnostics.
 */
export async function probeMarketDataForTicker(
  symbol: string,
  now: Date = new Date()
): Promise<TickerMarketDataProbeResult> {
  const normalized = symbol.toUpperCase();
  const { from, to } = getWatchlistHistoryRange(now);

  let fmpError: string | null = getActiveMarketDataProvider()
    ? null
    : "FMP_API_KEY not configured";
  let yahooError: string | null = null;
  let fmpCandle: DailyCandle | null = null;
  let yahooCandle: DailyCandle | null = null;

  const fmp = getActiveMarketDataProvider();
  if (fmp) {
    try {
      const candles = await fmp.fetchDailyCandles(normalized, from, to);
      fmpCandle = pickCompletedCandle(candles, now);
      if (!fmpCandle) {
        fmpError = `No completed candle through ${to}`;
      }
    } catch (e) {
      fmpError = e instanceof Error ? e.message : "FMP fetch failed";
    }
  }

  try {
    const candles = await yahooMarketDataProvider.fetchDailyCandles(
      normalized,
      from,
      to
    );
    yahooCandle = pickCompletedCandle(candles, now);
    if (!yahooCandle) {
      yahooError = `No completed candle through ${to}`;
    }
  } catch (e) {
    yahooError = e instanceof Error ? e.message : "Yahoo fetch failed";
  }

  try {
    const result = await fetchDailyCandlesForTicker(normalized, from, to);
    const candle = pickCompletedCandle(result.candles, now);
    if (!candle) {
      throw new Error(`No completed candle through ${to}`);
    }

    const fmpStatus = classifyFmpProbe(
      result.fmpError ?? fmpError,
      result.source === "fmp" || fmpCandle != null
    );
    const yahooStatus = classifyYahooProbe(
      result.yahooError ?? yahooError,
      result.source === "yahoo" || yahooCandle != null
    );

    return probeResultFromCandle(
      normalized,
      fmpStatus,
      result.fmpError ?? fmpError,
      yahooStatus,
      result.yahooError ?? yahooError,
      result.source,
      candle
    );
  } catch (e) {
    if (e instanceof MarketDataFetchError) {
      return probeResultFromCandle(
        normalized,
        classifyFmpProbe(e.fmpError, fmpCandle != null),
        e.fmpError,
        classifyYahooProbe(e.yahooError, yahooCandle != null),
        e.yahooError,
        null,
        null
      );
    }

    return probeResultFromCandle(
      normalized,
      classifyFmpProbe(fmpError, fmpCandle != null),
      fmpError,
      classifyYahooProbe(yahooError, yahooCandle != null),
      yahooError,
      null,
      null
    );
  }
}

export async function probeMarketDataForTickers(
  symbols: readonly string[],
  now: Date = new Date()
): Promise<TickerMarketDataProbeResult[]> {
  return Promise.all(symbols.map((symbol) => probeMarketDataForTicker(symbol, now)));
}

export function formatMarketDataFetchError(
  ticker: string,
  fmpError: string | null,
  yahooError: string | null
): string {
  const parts: string[] = [];
  if (fmpError) parts.push(`FMP: ${fmpError}`);
  if (yahooError) parts.push(`Yahoo: ${yahooError}`);
  return `${ticker}: ${parts.join(" | ") || "Both providers failed"}`;
}
