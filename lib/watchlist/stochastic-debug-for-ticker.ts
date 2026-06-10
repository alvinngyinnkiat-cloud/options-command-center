import {
  buildStochasticDebug,
  type StochasticDebugInfo,
} from "@/lib/watchlist/compute-indicators";
import type { DailyCandle } from "@/lib/watchlist/market-data-provider";
import type { MarketData } from "@/types/database";

export function marketDataToDailyCandles(rows: MarketData[]): DailyCandle[] {
  return [...rows]
    .sort((a, b) => a.price_date.localeCompare(b.price_date))
    .map((row) => ({
      date: row.price_date,
      open: Number(row.open),
      high: Number(row.high),
      low: Number(row.low),
      close: Number(row.close),
      volume: row.volume != null ? Number(row.volume) : null,
    }));
}

export function buildStochasticDebugFromMarketData(
  marketRows: MarketData[],
  ticker: string,
  completedCandleDate?: string
): StochasticDebugInfo | null {
  let candles = marketDataToDailyCandles(marketRows);
  if (completedCandleDate) {
    candles = candles.filter((c) => c.date <= completedCandleDate);
  }
  if (candles.length === 0) return null;
  return buildStochasticDebug(candles, ticker.toUpperCase());
}
