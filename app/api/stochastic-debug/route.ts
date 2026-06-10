import { NextResponse } from "next/server";
import { buildStochasticDebug } from "@/lib/watchlist/compute-indicators";
import { fetchDailyCandlesForTicker } from "@/lib/watchlist/market-data-provider";
import { getWatchlistHistoryRange } from "@/lib/watchlist/market-data-sync-range";
import { lastCompletedTradingDate } from "@/lib/market-calendar/nyse-calendar";

export const dynamic = "force-dynamic";

/**
 * Compare scanner stochastic vs TradingView for a ticker.
 * GET /api/stochastic-debug?symbol=IWM
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const symbol = (searchParams.get("symbol") ?? "IWM").trim().toUpperCase();

  if (!symbol) {
    return NextResponse.json({ error: "symbol required" }, { status: 400 });
  }

  const { from, to, completedCandleDate } = getWatchlistHistoryRange();

  try {
    const { candles, source } = await fetchDailyCandlesForTicker(symbol, from, to);
    const eligible = candles.filter((c) => c.date <= completedCandleDate);

    const debug = buildStochasticDebug(eligible, symbol);
    if (!debug) {
      return NextResponse.json(
        {
          error: "Insufficient daily candle history for stochastic",
          symbol,
          completedCandleDate,
          candleCount: eligible.length,
        },
        { status: 422 }
      );
    }

    return NextResponse.json({
      symbol,
      completedCandleDate,
      dataSource: source,
      timeframe: "daily",
      tradingViewSettings: {
        length: debug.soLength,
        kSmoothing: debug.soSmoothing,
        oversold: 20,
        overbought: 90,
      },
      debug: {
        ...debug,
        note: "soValue = fast %K (length 10). smoothedK = SMA(fast %K, 3).",
      },
      note: "Scanner uses completed daily candles only. Compare soValue to TradingView daily chart.",
    });
  } catch (e) {
    return NextResponse.json(
      {
        error: e instanceof Error ? e.message : "fetch failed",
        symbol,
        completedCandleDate: lastCompletedTradingDate(),
      },
      { status: 500 }
    );
  }
}
