"use server";

import { stockEtfRowFromForm } from "@/lib/stocks-etfs/map-holding";
import type {
  StockEtfActionResult,
  StockEtfHoldingFormInput,
} from "@/lib/stocks-etfs/types";
import {
  getStockEtfTrackerData,
  persistStockEtfHolding,
  removeStockEtfHolding,
} from "@/lib/supabase/queries/stock-etf-holdings";
import { isSupabaseConfigured } from "@/lib/supabase/is-configured";
import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

async function finish(): Promise<StockEtfActionResult> {
  const data = await getStockEtfTrackerData();
  revalidatePath("/stocks");
  revalidatePath("/");
  revalidatePath("/goals");
  return { success: true, data };
}

async function resolveUserId(): Promise<string | undefined> {
  if (!isSupabaseConfigured()) return undefined;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user?.id;
}

export async function createStockEtfHolding(
  input: StockEtfHoldingFormInput
): Promise<StockEtfActionResult> {
  try {
    const userId = (await resolveUserId()) ?? "mock-user";
    const row = stockEtfRowFromForm(input, userId);
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
    const userId = (await resolveUserId()) ?? "mock-user";
    const row = stockEtfRowFromForm(input, userId, id, createdAt);
    await persistStockEtfHolding(row, userId);
    return finish();
  } catch (e) {
    return {
      success: false,
      error: e instanceof Error ? e.message : "Failed to update holding.",
    };
  }
}

export async function deleteStockEtfHolding(
  id: string
): Promise<StockEtfActionResult> {
  try {
    const userId = await resolveUserId();
    await removeStockEtfHolding(id, userId);
    return finish();
  } catch (e) {
    return {
      success: false,
      error: e instanceof Error ? e.message : "Failed to delete holding.",
    };
  }
}
