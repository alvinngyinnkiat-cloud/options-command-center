import type { DailyCandle } from "@/lib/watchlist/market-data-provider";
import { toYahooSymbol } from "@/lib/watchlist/market-data-symbols";

export { toYahooSymbol } from "@/lib/watchlist/market-data-symbols";

const YAHOO_CHART_ENDPOINT = "https://query1.finance.yahoo.com/v8/finance/chart";

function formatNyseDate(unixSeconds: number): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/New_York",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date(unixSeconds * 1000));
}

function parseFromDate(from: string): number {
  return Math.floor(new Date(`${from}T00:00:00Z`).getTime() / 1000);
}

function parseToDate(to: string): number {
  return Math.floor(new Date(`${to}T23:59:59Z`).getTime() / 1000);
}

export class YahooMarketDataProvider {
  readonly name = "yahoo" as const;

  async fetchDailyCandles(
    ticker: string,
    from: string,
    to: string
  ): Promise<DailyCandle[]> {
    const yahooSymbol = toYahooSymbol(ticker);
    const period1 = parseFromDate(from);
    const period2 = parseToDate(to);

    const params = new URLSearchParams({
      interval: "1d",
      period1: String(period1),
      period2: String(period2),
      includePrePost: "false",
      events: "div,split",
    });

    const url = `${YAHOO_CHART_ENDPOINT}/${encodeURIComponent(yahooSymbol)}?${params}`;
    const res = await fetch(url, {
      cache: "no-store",
      headers: {
        "User-Agent":
          "Mozilla/5.0 (compatible; OptionsCommandCenter/1.0; +https://localhost)",
        Accept: "application/json",
      },
    });

    if (!res.ok) {
      throw new Error(
        `Yahoo OHLCV fetch failed for ${yahooSymbol}: HTTP ${res.status}`
      );
    }

    const json = (await res.json()) as {
      chart?: {
        error?: { description?: string };
        result?: Array<{
          timestamp?: number[];
          indicators?: {
            quote?: Array<{
              open?: (number | null)[];
              high?: (number | null)[];
              low?: (number | null)[];
              close?: (number | null)[];
              volume?: (number | null)[];
            }>;
          };
        }>;
      };
    };

    const chartError = json.chart?.error?.description;
    if (chartError) {
      throw new Error(
        `Yahoo OHLCV fetch failed for ${yahooSymbol}: ${chartError}`
      );
    }

    const result = json.chart?.result?.[0];
    const timestamps = result?.timestamp ?? [];
    const quote = result?.indicators?.quote?.[0];

    if (!quote || timestamps.length === 0) {
      throw new Error(
        `Yahoo returned no daily candles for ${yahooSymbol} (unsupported or delisted)`
      );
    }

    const candles: DailyCandle[] = [];

    for (let i = 0; i < timestamps.length; i++) {
      const ts = timestamps[i];
      const close = quote.close?.[i];
      const high = quote.high?.[i];
      const low = quote.low?.[i];
      const open = quote.open?.[i];
      const volume = quote.volume?.[i];

      if (ts == null || close == null || !Number.isFinite(close)) continue;
      if (high == null || low == null || open == null) continue;

      const date = formatNyseDate(ts);
      if (date < from || date > to) continue;

      candles.push({
        date,
        open: Number(open),
        high: Number(high),
        low: Number(low),
        close: Number(close),
        volume: volume != null && Number.isFinite(volume) ? Number(volume) : null,
      });
    }

    if (candles.length === 0) {
      throw new Error(
        `Yahoo returned no completed candles in range for ${yahooSymbol}`
      );
    }

    return candles.sort((a, b) => a.date.localeCompare(b.date));
  }
}

export const yahooMarketDataProvider = new YahooMarketDataProvider();
