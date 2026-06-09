import { randomUUID } from "crypto";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  SG_STOCK_PRICE_LOG_SOURCE,
  syncSgStockPricesForUser,
  syncUsStockEtfPricesForUser,
  US_STOCK_ETF_PRICE_LOG_SOURCE,
  type StockPriceSyncResult,
} from "@/lib/stocks-etfs/sync-holding-market-prices";
import type { Database } from "@/types/database";

type AdminClient = SupabaseClient<Database>;

async function listUsersWithHoldings(admin: AdminClient): Promise<string[]> {
  const { data, error } = await admin
    .from("stock_etf_holdings")
    .select("user_id");

  if (error) throw new Error(error.message);

  return [...new Set((data ?? []).map((r) => (r as { user_id: string }).user_id))];
}

async function logPriceSync(
  userId: string,
  sourceName: string,
  startedAt: string,
  result: StockPriceSyncResult,
  admin: AdminClient
): Promise<void> {
  const status =
    result.rowsFailed === 0
      ? "success"
      : result.rowsUpdated > 0
        ? "partial"
        : "failed";

  await admin.from("data_source_logs").insert({
    id: randomUUID(),
    user_id: userId,
    source_name: sourceName,
    status,
    records_updated: result.rowsUpdated,
    records_failed: result.rowsFailed,
    error_message:
      result.failedTickers.length > 0
        ? `Failed: ${result.failedTickers.join(", ")}`
        : result.errors.length > 0
          ? result.errors.slice(0, 3).join("; ")
          : null,
    started_at: startedAt,
    completed_at: new Date().toISOString(),
    created_at: new Date().toISOString(),
  } as never);
}

export async function runScheduledUsStockEtfPriceRefresh(
  now: Date = new Date(),
  admin: AdminClient = createAdminClient()
): Promise<{ usersProcessed: number; results: StockPriceSyncResult[] }> {
  const startedAt = now.toISOString();
  const userIds = await listUsersWithHoldings(admin);
  const results: StockPriceSyncResult[] = [];

  for (const userId of userIds) {
    const result = await syncUsStockEtfPricesForUser(userId, now, admin);
    results.push(result);
    await logPriceSync(userId, US_STOCK_ETF_PRICE_LOG_SOURCE, startedAt, result, admin);
  }

  return { usersProcessed: userIds.length, results };
}

export async function runScheduledSgStockPriceRefresh(
  now: Date = new Date(),
  admin: AdminClient = createAdminClient()
): Promise<{ usersProcessed: number; results: StockPriceSyncResult[] }> {
  const startedAt = now.toISOString();
  const userIds = await listUsersWithHoldings(admin);
  const results: StockPriceSyncResult[] = [];

  for (const userId of userIds) {
    const result = await syncSgStockPricesForUser(userId, now, admin);
    results.push(result);
    await logPriceSync(userId, SG_STOCK_PRICE_LOG_SOURCE, startedAt, result, admin);
  }

  return { usersProcessed: userIds.length, results };
}
