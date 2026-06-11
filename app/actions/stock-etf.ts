"use server";

import { stockEtfRowFromForm } from "@/lib/stocks-etfs/map-holding";
import { resolveHoldingTrackingMode } from "@/lib/stocks-etfs/tracking-mode";
import type {
  StockEtfActionResult,
  StockEtfHoldingFormInput,
  StockEtfTrackingMode,
} from "@/lib/stocks-etfs/types";
import {
  getStockEtfHoldingsRows,
  getStockEtfTrackerData,
  persistStockEtfHolding,
  removeStockEtfHolding,
} from "@/lib/supabase/queries/stock-etf-holdings";
import { migrateHoldingToTransactionMode } from "@/lib/supabase/queries/stock-etf-positions";
import {
  getStockEtfTrackingModeDefault,
  setStockEtfTrackingModeDefault,
} from "@/lib/supabase/queries/stock-etf-tracking-mode";
import { requireUserId } from "@/lib/supabase/resolve-user";
import { revalidatePath } from "next/cache";

async function finish(): Promise<StockEtfActionResult> {
  const data = await getStockEtfTrackerData();
  revalidatePath("/stocks");
  revalidatePath("/");
  revalidatePath("/goals");
  return { success: true, data };
}

export async function createStockEtfHolding(
  input: StockEtfHoldingFormInput
): Promise<StockEtfActionResult> {
  try {
    const userId = await requireUserId();
    const defaultMode = await getStockEtfTrackingModeDefault();
    const row = stockEtfRowFromForm(input, userId, undefined, undefined, {
      trackingMode: defaultMode,
    });
    await persistStockEtfHolding(row, userId);
    return finish();
  } catch (e) {
    return {
      success: false,
      error: e instanceof Error ? e.message : "Failed to add holding.",
    };
  }
}

export async function updateStockEtfHolding(
  id: string,
  input: StockEtfHoldingFormInput,
  createdAt?: string
): Promise<StockEtfActionResult> {
  try {
    const userId = await requireUserId();
    const rows = await getStockEtfHoldingsRows();
    const existing = rows.find((r) => r.id === id);
    const trackingMode = existing
      ? resolveHoldingTrackingMode(existing)
      : "manual";
    const row = stockEtfRowFromForm(input, userId, id, createdAt, {
      trackingMode,
    });
    await persistStockEtfHolding(row, userId);
    return finish();
  } catch (e) {
    return {
      success: false,
      error: e instanceof Error ? e.message : "Failed to update holding.",
    };
  }
}

export async function setStockEtfTrackingMode(
  mode: StockEtfTrackingMode
): Promise<StockEtfActionResult> {
  try {
    const userId = await requireUserId();
    await setStockEtfTrackingModeDefault(mode, userId);
    return finish();
  } catch (e) {
    return {
      success: false,
      error: e instanceof Error ? e.message : "Failed to update tracking mode.",
    };
  }
}

export async function migrateStockEtfHoldingToTransactionMode(
  holdingId: string
): Promise<
  StockEtfActionResult & { ledgerWarning?: string }
> {
  try {
    const userId = await requireUserId();
    const { ledgerWarning } = await migrateHoldingToTransactionMode(
      holdingId,
      userId
    );
    const result = await finish();
    if (!result.success) return result;
    return { ...result, ledgerWarning };
  } catch (e) {
    return {
      success: false,
      error:
        e instanceof Error ? e.message : "Failed to migrate position to transaction mode.",
    };
  }
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
    /** @deprecated Use deleteTransactionHistory */
    deleteLedgerEntries?: boolean;
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
