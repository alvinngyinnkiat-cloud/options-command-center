import { lastCompletedTradingDate } from "@/lib/market-calendar/nyse-calendar";
import { fetchDailyCandlesForTicker } from "@/lib/watchlist/market-data-provider";
import { toYahooSymbol } from "@/lib/watchlist/yahoo-market-data-provider";
import { toSgYahooSymbol } from "@/lib/stocks-etfs/sg-yahoo-symbol";
import { subDays, format } from "date-fns";

export interface LatestMarketPrice {
  ticker: string;
  price: number;
  priceDate: string;
  source: "yahoo" | "fmp";
  yahooSymbol: string;
}

function pickLatestCompletedClose(
  candles: { date: string; close: number }[],
  completedDate: string
): { price: number; priceDate: string } | null {
  const eligible = candles.filter((c) => c.date <= completedDate);
  if (eligible.length === 0) return null;
  const latest = eligible[eligible.length - 1]!;
  return { price: latest.close, priceDate: latest.date };
}

export async function fetchLatestUsMarketPrice(
  ticker: string,
  now: Date = new Date()
): Promise<LatestMarketPrice | null> {
  const completedDate = lastCompletedTradingDate(now);
  const to = completedDate;
  const from = format(subDays(new Date(`${completedDate}T12:00:00`), 14), "yyyy-MM-dd");

  try {
    const { candles, source } = await fetchDailyCandlesForTicker(ticker, from, to);
    const picked = pickLatestCompletedClose(candles, completedDate);
    if (!picked) return null;

    return {
      ticker: ticker.toUpperCase(),
      price: picked.price,
      priceDate: picked.priceDate,
      source,
      yahooSymbol: toYahooSymbol(ticker),
    };
  } catch {
    return null;
  }
}

export async function fetchLatestSgMarketPrice(
  ticker: string,
  now: Date = new Date()
): Promise<LatestMarketPrice | null> {
  const yahooSymbol = toSgYahooSymbol(ticker);
  const to = format(now, "yyyy-MM-dd");
  const from = format(subDays(now, 21), "yyyy-MM-dd");

  try {
    const { yahooMarketDataProvider } = await import(
      "@/lib/watchlist/yahoo-market-data-provider"
    );
    const candles = await yahooMarketDataProvider.fetchDailyCandles(
      yahooSymbol,
      from,
      to
    );
    const latest = candles[candles.length - 1];
    if (!latest) return null;

    return {
      ticker: ticker.toUpperCase(),
      price: latest.close,
      priceDate: latest.date,
      source: "yahoo",
      yahooSymbol,
    };
  } catch {
    return null;
  }
}

export function computeCurrentValueFromPrice(
  shares: number | null | undefined,
  price: number | null | undefined
): number | null {
  if (shares == null || shares <= 0 || price == null || price <= 0) return null;
  return Math.round(shares * price * 100) / 100;
}
