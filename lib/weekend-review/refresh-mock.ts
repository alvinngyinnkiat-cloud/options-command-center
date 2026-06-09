import {
  buildMarketDataFields,
  buildPreviousDayMarket,
  enrichScannerRow,
} from "@/lib/watchlist/calculations";
import { getMockTechnicalSnapshot } from "@/lib/mock/watchlist-scanner";
import type {
  TechnicalIndicatorFields,
  WatchlistScannerRow,
} from "@/lib/watchlist/types";

function jitter(multiplier = 1, spread = 0.003): number {
  return multiplier * (1 + (Math.random() - 0.5) * spread * 2);
}

function jitterTechnicals(
  technicals: TechnicalIndicatorFields
): TechnicalIndicatorFields {
  return {
    atr14: jitter(technicals.atr14, 0.01),
    ema20: jitter(technicals.ema20),
    sma50: jitter(technicals.sma50),
    sma200: jitter(technicals.sma200),
    stochastic: Math.min(100, Math.max(0, jitter(technicals.stochastic, 0.02))),
  };
}

/**
 * Simulates refreshed market data and indicators for mock mode.
 * Preserves manual support/resistance exactly — never modified.
 */
export function refreshMockScannerRows(
  rows: WatchlistScannerRow[]
): WatchlistScannerRow[] {
  return rows.map((row) => {
    const close = jitter(row.market.close);
    const high = Math.max(jitter(row.market.high), close);
    const low = Math.min(jitter(row.market.low), close);
    const open = jitter(row.market.open);
    const previousClose = row.market.previousClose;

    const market = buildMarketDataFields(open, high, low, close, previousClose);

    const previousMarket = buildPreviousDayMarket(
      jitter(row.previousMarket.high),
      jitter(row.previousMarket.low)
    );

    const snapshot = getMockTechnicalSnapshot(row.ticker);
    const technicals = jitterTechnicals(snapshot.today);
    const previousTechnicals = snapshot.previous;

    return enrichScannerRow(
      row.watchlistId,
      row.ticker,
      row.sortOrder,
      market,
      previousMarket,
      technicals,
      previousTechnicals,
      row.supportResistance,
      row.category,
      row.weeklySupportResistance
    );
  });
}
