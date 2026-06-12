"use server";

import type { StockEtfActionResult } from "@/lib/stocks-etfs/types";
import {
  getStockEtfTrackerData,
  removeStockEtfHolding,
} from "@/lib/supabase/queries/stock-etf-holdings";
import { requireUserId } from "@/lib/supabase/resolve-user";
import { revalidatePath } from "next/cache";

async function finish(): Promise<StockEtfActionResult> {
  const data = await getStockEtfTrackerData();
  revalidatePath("/stocks");
  revalidatePath("/");
  revalidatePath("/goals");
  return { success: true, data };
}

export async function refreshStockMarketPricesAction(): Promise<StockEtfActionResult> {
  try {
    const userId = await requireUserId();
    const { createAdminClient } = await import("@/lib/supabase/admin");
    const admin = createAdminClient();
    const { syncUsStockEtfPricesForUser, syncSgStockPricesForUser } =
      await import("@/lib/stocks-etfs/sync-holding-market-prices");

    await Promise.all([
      syncUsStockEtfPricesForUser(userId, new Date(), admin),
      syncSgStockPricesForUser(userId, new Date(), admin),
    ]);

    return finish();
  } catch (e) {
    return {
      success: false,
      error: e instanceof Error ? e.message : "Failed to refresh market prices.",
    };
  }
}

export async function deleteStockEtfHolding(
  id: string,
  options?: {
    deleteTransactionHistory?: boolean;
  }
): Promise<StockEtfActionResult> {
  try {
    const userId = await requireUserId();
    await removeStockEtfHolding(id, userId, options);
    return finish();
  } catch (e) {
    return {
      success: false,
      error: e instanceof Error ? e.message : "Failed to delete holding.",
    };
  }
}
