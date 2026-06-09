import { MarketDataFetchError } from "@/lib/watchlist/market-data-fetch-error";
import { toFmpSymbol } from "@/lib/watchlist/market-data-symbols";
import { yahooMarketDataProvider } from "@/lib/watchlist/yahoo-market-data-provider";

export const FMP_EOD_ENDPOINT =
  "https://financialmodelingprep.com/stable/historical-price-eod/full";

export interface DailyCandle {
  date: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number | null;
}

export type MarketDataFetchSource = "fmp" | "yahoo";

export interface MarketDataProviderResult {
  candles: DailyCandle[];
  source: MarketDataFetchSource;
  fmpError: string | null;
  yahooError: string | null;
}

export class FmpFetchError extends Error {
  readonly recoverable: boolean;

  constructor(message: string, recoverable: boolean) {
    super(message);
    this.name = "FmpFetchError";
    this.recoverable = recoverable;
  }
}

export function isRecoverableFmpFailure(error: unknown): boolean {
  if (error instanceof FmpFetchError) return error.recoverable;

  const message = error instanceof Error ? error.message : String(error);
  return (
    /402|403|429|premium|subscription|legacy endpoint|not available under your current subscription|unsupported|no completed candles|no data|empty|rate.?limit|quota/i.test(
      message
    )
  );
}

function parseFmpErrorMessage(raw: string, json: unknown): string | null {
  if (typeof json === "object" && json && "Error Message" in json) {
    return String((json as { "Error Message": string })["Error Message"]);
  }
  if (/^Premium Query Parameter/i.test(raw.trim())) return raw.trim();
  return null;
}

function isRecoverableFmpHttp(status: number, message: string | null): boolean {
  if (status === 402 || status === 403 || status === 429) return true;
  return /premium|subscription|rate|limit|quota|unsupported/i.test(message ?? "");
}

export class FmpMarketDataProvider {
  readonly name = "fmp" as const;

  constructor(private apiKey: string) {}

  async fetchDailyCandles(
    ticker: string,
    from: string,
    to: string
  ): Promise<DailyCandle[]> {
    const symbol = toFmpSymbol(ticker);
    const params = new URLSearchParams({
      symbol,
      from,
      to,
      apikey: this.apiKey,
    });

    const url = `${FMP_EOD_ENDPOINT}?${params}`;
    const res = await fetch(url, { cache: "no-store" });
    const raw = await res.text();

    if (
      res.status === 402 ||
      res.status === 403 ||
      res.status === 429 ||
      /^Premium Query Parameter/i.test(raw.trim())
    ) {
      const label =
        res.status === 429 ? "rate limited" : "premium or subscription restriction";
      throw new FmpFetchError(
        `FMP ${label} for ${symbol}: HTTP ${res.status}`,
        true
      );
    }

    let json: unknown;
    try {
      json = JSON.parse(raw) as
        | DailyCandle[]
        | { historical?: DailyCandle[]; "Error Message"?: string };
    } catch {
      throw new FmpFetchError(
        `FMP returned non-JSON for ${symbol}: ${raw.slice(0, 80)}`,
        true
      );
    }

    const message = parseFmpErrorMessage(raw, json);

    if (!res.ok) {
      throw new FmpFetchError(
        `FMP OHLCV fetch failed for ${symbol}: ${message ?? `HTTP ${res.status}`}`,
        isRecoverableFmpHttp(res.status, message)
      );
    }

    if (message && /premium|subscription|legacy|not available|unsupported/i.test(message)) {
      throw new FmpFetchError(
        `FMP OHLCV fetch failed for ${symbol}: ${message}`,
        true
      );
    }

    const rows = Array.isArray(json)
      ? json
      : ((json as { historical?: DailyCandle[] }).historical ?? []);

    const candles = rows
      .map((row) => ({
        date: row.date,
        open: Number(row.open),
        high: Number(row.high),
        low: Number(row.low),
        close: Number(row.close),
        volume: row.volume != null ? Number(row.volume) : null,
      }))
      .filter((row) => row.date && Number.isFinite(row.close))
      .sort((a, b) => a.date.localeCompare(b.date));

    if (candles.length === 0) {
      throw new FmpFetchError(
        `FMP returned no daily candles for ${symbol}`,
        true
      );
    }

    return candles;
  }
}

export function getActiveMarketDataProvider(): FmpMarketDataProvider | null {
  const fmpKey = process.env.FMP_API_KEY?.trim();
  if (fmpKey) return new FmpMarketDataProvider(fmpKey);
  return null;
}

export async function fetchDailyCandlesForTicker(
  ticker: string,
  from: string,
  to: string
): Promise<MarketDataProviderResult> {
  const normalized = ticker.toUpperCase();
  let fmpError: string | null = null;
  const fmp = getActiveMarketDataProvider();

  if (fmp) {
    try {
      const candles = await fmp.fetchDailyCandles(normalized, from, to);
      return { candles, source: "fmp", fmpError: null, yahooError: null };
    } catch (error) {
      fmpError = error instanceof Error ? error.message : "FMP fetch failed";
      if (!isRecoverableFmpFailure(error)) {
        throw new MarketDataFetchError(normalized, fmpError, null);
      }
    }
  } else {
    fmpError = "FMP_API_KEY not configured";
  }

  try {
    const candles = await yahooMarketDataProvider.fetchDailyCandles(
      normalized,
      from,
      to
    );
    return { candles, source: "yahoo", fmpError, yahooError: null };
  } catch (error) {
    const yahooError =
      error instanceof Error ? error.message : "Yahoo fetch failed";
    throw new MarketDataFetchError(normalized, fmpError, yahooError);
  }
}

export { MarketDataFetchError };
