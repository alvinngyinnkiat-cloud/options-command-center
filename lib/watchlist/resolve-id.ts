import { normalizeTicker } from "@/lib/watchlist/calculations";

/** Mock-mode watchlist IDs used when Supabase is not configured. */
export function mockWatchlistIdForTicker(ticker: string): string {
  return `mock-${normalizeTicker(ticker)}`;
}

export function isMockWatchlistId(id: string | null | undefined): boolean {
  return Boolean(id?.startsWith("mock-"));
}
