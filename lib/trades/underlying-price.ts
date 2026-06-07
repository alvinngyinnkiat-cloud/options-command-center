import { buildMockScannerRows } from "@/lib/mock/watchlist-scanner";
import { isSupabaseConfigured } from "@/lib/supabase/is-configured";
import { createClient } from "@/lib/supabase/server";

function mockCurrentPriceByTicker(): Map<string, number> {
  const map = new Map<string, number>();
  for (const row of buildMockScannerRows()) {
    map.set(row.ticker.toUpperCase(), row.market.currentPrice);
  }
  return map;
}

async function cachedCurrentPriceByTicker(
  tickers: string[],
  userId?: string
): Promise<Map<string, number>> {
  const map = new Map<string, number>();
  if (!isSupabaseConfigured() || !userId || tickers.length === 0) return map;

  const supabase = await createClient();
  const { data } = await supabase
    .from("market_data")
    .select("ticker, close, price_date, watchlist!inner(user_id)")
    .eq("watchlist.user_id", userId)
    .in("ticker", tickers)
    .order("price_date", { ascending: false });

  if (!data?.length) return map;

  for (const row of data) {
    const ticker = (row as { ticker: string }).ticker.toUpperCase();
    if (map.has(ticker)) continue;
    map.set(ticker, Number((row as { close: number }).close));
  }

  return map;
}

/** Current stock price for breakeven distance — cache first, then mock. Not displayed in UI. */
export async function resolveUnderlyingCurrentPrices(
  tickers: string[],
  userId?: string
): Promise<Map<string, number>> {
  const unique = [
    ...new Set(tickers.map((t) => t.trim().toUpperCase()).filter(Boolean)),
  ];
  const mock = mockCurrentPriceByTicker();
  const cached = await cachedCurrentPriceByTicker(unique, userId);
  const result = new Map<string, number>();

  for (const ticker of unique) {
    const price = cached.get(ticker) ?? mock.get(ticker);
    if (price != null) result.set(ticker, price);
  }

  return result;
}
