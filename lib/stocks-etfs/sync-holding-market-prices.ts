import type { SupabaseClient } from "@supabase/supabase-js";
import { toSgdAmount } from "@/lib/stocks-etfs/calculations";
import {
  computeCurrentValueFromPrice,
  fetchLatestSgMarketPrice,
  fetchLatestUsMarketPrice,
} from "@/lib/stocks-etfs/market-price-provider";
import { createAdminClient } from "@/lib/supabase/admin";
import type { Database, StockEtfHolding } from "@/types/database";
import type { CurrencyCode } from "@/types/database";

export const US_STOCK_ETF_PRICE_LOG_SOURCE = "us_stock_etf_prices";
export const SG_STOCK_PRICE_LOG_SOURCE = "sg_stock_prices";

export interface StockPriceSyncResult {
  region: "us" | "sg";
  rowsUpdated: number;
  rowsFailed: number;
  failedTickers: string[];
  errors: string[];
}

type DbClient = SupabaseClient<Database>;

async function fetchHoldingsForRegion(
  userId: string,
  region: "us" | "sg",
  supabase: DbClient
): Promise<StockEtfHolding[]> {
  const { data, error } = await supabase
    .from("stock_etf_holdings")
    .select("*")
    .eq("user_id", userId);

  if (error) return [];
  const rows = (data ?? []) as StockEtfHolding[];

  return rows.filter((row) => {
    if (region === "sg") return row.currency === "SGD";
    return row.currency === "USD";
  });
}

async function applyPriceToHolding(
  holding: StockEtfHolding,
  price: number,
  priceDate: string,
  source: string,
  supabase: DbClient
): Promise<boolean> {
  if (holding.manual_value_override) return false;

  const shares = holding.shares_held != null ? Number(holding.shares_held) : 0;
  const currentValueNative = computeCurrentValueFromPrice(shares, price);
  if (currentValueNative == null) return false;

  const currency = holding.currency as CurrencyCode;
  const fx = Number(holding.fx_rate_to_sgd);
  const now = new Date().toISOString();
  const today = now.split("T")[0];

  const { error } = await supabase
    .from("stock_etf_holdings")
    .update({
      last_market_price_native: price,
      last_price_date: priceDate,
      price_source: source,
      current_value_native: currentValueNative,
      current_value_sgd: toSgdAmount(currentValueNative, currency, fx),
      last_updated: today,
      updated_at: now,
    } as never)
    .eq("id", holding.id);

  return !error;
}

export async function syncUsStockEtfPricesForUser(
  userId: string,
  now: Date = new Date(),
  supabase?: DbClient
): Promise<StockPriceSyncResult> {
  const client = supabase ?? createAdminClient();
  const holdings = await fetchHoldingsForRegion(userId, "us", client);
  const result: StockPriceSyncResult = {
    region: "us",
    rowsUpdated: 0,
    rowsFailed: 0,
    failedTickers: [],
    errors: [],
  };

  for (const holding of holdings) {
    const ticker = holding.ticker.toUpperCase();
    try {
      const quote = await fetchLatestUsMarketPrice(ticker, now);
      if (!quote) {
        result.rowsFailed++;
        result.failedTickers.push(ticker);
        continue;
      }

      const ok = await applyPriceToHolding(
        holding,
        quote.price,
        quote.priceDate,
        quote.source,
        client
      );
      if (ok) result.rowsUpdated++;
      else result.rowsFailed++;
    } catch (e) {
      result.rowsFailed++;
      result.failedTickers.push(ticker);
      result.errors.push(
        e instanceof Error ? e.message : `Failed ${ticker}`
      );
    }
  }

  return result;
}

export async function syncSgStockPricesForUser(
  userId: string,
  now: Date = new Date(),
  supabase?: DbClient
): Promise<StockPriceSyncResult> {
  const client = supabase ?? createAdminClient();
  const holdings = await fetchHoldingsForRegion(userId, "sg", client);
  const result: StockPriceSyncResult = {
    region: "sg",
    rowsUpdated: 0,
    rowsFailed: 0,
    failedTickers: [],
    errors: [],
  };

  for (const holding of holdings) {
    const ticker = holding.ticker.toUpperCase();
    try {
      const quote = await fetchLatestSgMarketPrice(ticker, now);
      if (!quote) {
        result.rowsFailed++;
        result.failedTickers.push(ticker);
        continue;
      }

      const ok = await applyPriceToHolding(
        holding,
        quote.price,
        quote.priceDate,
        quote.source,
        client
      );
      if (ok) result.rowsUpdated++;
      else result.rowsFailed++;
    } catch (e) {
      result.rowsFailed++;
      result.failedTickers.push(ticker);
      result.errors.push(
        e instanceof Error ? e.message : `Failed ${ticker}`
      );
    }
  }

  return result;
}
