"use server";

import { cryptoRowFromForm } from "@/lib/crypto/map-holding";
import type { CryptoActionResult, CryptoHoldingFormInput } from "@/lib/crypto/types";
import {
  getCryptoTrackerData,
  persistCryptoHolding,
  removeCryptoHolding,
} from "@/lib/supabase/queries/crypto-holdings";
import { requireUserId } from "@/lib/supabase/resolve-user";
import { revalidatePath } from "next/cache";

async function finish(): Promise<CryptoActionResult> {
  const data = await getCryptoTrackerData();
  revalidatePath("/crypto");
  revalidatePath("/");
  return { success: true, data };
}

export async function createCryptoHolding(
  input: CryptoHoldingFormInput
): Promise<CryptoActionResult> {
  try {
    const userId = await requireUserId();
    const row = cryptoRowFromForm(input, userId);
    await persistCryptoHolding(row, userId);
    return finish();
  } catch (e) {
    return {
      success: false,
      error: e instanceof Error ? e.message : "Failed to add crypto holding.",
    };
  }
}

export async function updateCryptoHolding(
  id: string,
  input: CryptoHoldingFormInput,
  createdAt?: string
): Promise<CryptoActionResult> {
  try {
    const userId = await requireUserId();
    const row = cryptoRowFromForm(input, userId, id, createdAt);
    await persistCryptoHolding(row, userId);
    return finish();
  } catch (e) {
    return {
      success: false,
      error: e instanceof Error ? e.message : "Failed to update crypto holding.",
    };
  }
}

export async function deleteCryptoHolding(
  id: string
): Promise<CryptoActionResult> {
  try {
    const userId = await requireUserId();
    await removeCryptoHolding(id, userId);
    return finish();
  } catch (e) {
    return {
      success: false,
      error: e instanceof Error ? e.message : "Failed to delete crypto holding.",
    };
  }
}
