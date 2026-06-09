import { NextResponse } from "next/server";
import { lastCompletedTradingDate } from "@/lib/market-calendar/nyse-calendar";
import { FMP_EOD_ENDPOINT } from "@/lib/watchlist/market-data-provider";
import {
  MARKET_DATA_TEST_SYMBOLS,
  probeMarketDataForTickers,
} from "@/lib/watchlist/market-data-probe";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const symbolsParam = searchParams.get("symbols");
  const symbols = symbolsParam
    ? symbolsParam.split(",").map((s) => s.trim().toUpperCase()).filter(Boolean)
    : [...MARKET_DATA_TEST_SYMBOLS];

  const completedCandleTarget = lastCompletedTradingDate();
  const results = await probeMarketDataForTickers(symbols);

  const fmpSuccess = results.filter((r) => r.selectedSource === "fmp").length;
  const yahooSuccess = results.filter((r) => r.selectedSource === "yahoo").length;
  const failed = results.filter((r) => r.finalStatus === "failed").length;

  return NextResponse.json({
    completedCandleTarget,
    fmpEndpoint: FMP_EOD_ENDPOINT,
    apiKeyConfigured: !!process.env.FMP_API_KEY?.trim(),
    summary: {
      fmpSuccess,
      yahooSuccess,
      failed,
      total: results.length,
    },
    tickers: results.map((row) => ({
      symbol: row.symbol,
      fmpStatus: row.fmpStatus,
      fmpError: row.fmpError,
      yahooStatus: row.yahooStatus,
      yahooError: row.yahooError,
      selectedSource: row.selectedSource,
      candleDate: row.candleDate,
      high: row.high,
      low: row.low,
      averagePrice: row.averagePrice,
      finalStatus: row.finalStatus,
      error: row.error,
    })),
  });
}
