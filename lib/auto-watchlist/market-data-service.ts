import { MOCK_MARKET_CAP_UNIVERSE } from "@/lib/mock/auto-watchlist-universe";
import type { MarketCapSnapshot } from "./types";

/**
 * Pluggable market data provider.
 * Replace `fetchMarketCapUniverse` implementation when a live API is connected.
 */
export interface MarketDataProvider {
  readonly source: "mock" | "api";
  fetchUniverse(): Promise<MarketCapSnapshot[]>;
}

function jitter(value: number, spread = 0.008): number {
  return value * (1 + (Math.random() - 0.5) * spread * 2);
}

/** Mock provider — simulates refreshed quotes with light jitter on each refresh. */
export class MockMarketDataProvider implements MarketDataProvider {
  readonly source = "mock" as const;

  async fetchUniverse(): Promise<MarketCapSnapshot[]> {
    return MOCK_MARKET_CAP_UNIVERSE.map((row) => ({
      ...row,
      currentPrice: Math.round(jitter(row.currentPrice) * 100) / 100,
      oneYearPerformancePercent:
        Math.round(jitter(row.oneYearPerformancePercent, 0.02) * 100) / 100,
      marketCapBillions:
        Math.round(jitter(row.marketCapBillions, 0.005) * 10) / 10,
    }));
  }
}

/**
 * Placeholder for a future live market API (Polygon, Finnhub, etc.).
 * Wire credentials in Settings and swap the active provider here.
 */
export class ApiMarketDataProvider implements MarketDataProvider {
  readonly source = "api" as const;

  async fetchUniverse(): Promise<MarketCapSnapshot[]> {
    // TODO: connect real market cap + 1-year performance API
    throw new Error("Market API not configured — using mock data.");
  }
}

export function getActiveMarketDataProvider(): MarketDataProvider {
  const apiKey = process.env.MARKET_DATA_API_KEY;
  if (apiKey) {
    return new ApiMarketDataProvider();
  }
  return new MockMarketDataProvider();
}

export async function fetchMarketCapUniverse(): Promise<{
  snapshots: MarketCapSnapshot[];
  source: "mock" | "api";
}> {
  const provider = getActiveMarketDataProvider();
  try {
    const snapshots = await provider.fetchUniverse();
    return { snapshots, source: provider.source };
  } catch {
    const fallback = new MockMarketDataProvider();
    const snapshots = await fallback.fetchUniverse();
    return { snapshots, source: "mock" };
  }
}
