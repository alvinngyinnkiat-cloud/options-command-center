"use server";

import { clientRowFromForm } from "@/lib/client-profit-sharing/map-client";
import type {
  ClientProfitSharingActionResult,
  ClientProfileFormInput,
} from "@/lib/client-profit-sharing/types";
import {
  getClientProfitSharingData,
  persistProfitSharingClient,
  persistTradeAllocation,
  recordClientPayment,
  removeProfitSharingClient,
} from "@/lib/supabase/queries/client-profit-sharing";
import { requireUserId } from "@/lib/supabase/resolve-user";
import {
  markAllocationPaid,
} from "@/lib/supabase/queries/client-profit-sharing";
import type { ClientTradeAllocation } from "@/types/database";
import { revalidatePath } from "next/cache";

async function finish(
  activeClientId?: string | null
): Promise<ClientProfitSharingActionResult> {
  const data = await getClientProfitSharingData(activeClientId);
  revalidatePath("/client-profit-sharing");
  return { success: true, data };
}

export async function saveClientProfile(
  input: ClientProfileFormInput,
  existingId?: string,
  existingPaid?: number,
  existingCreatedAt?: string
): Promise<ClientProfitSharingActionResult> {
  try {
    if (input.clientSharePct + input.mySharePct !== 100) {
      return { success: false, error: "Client and my share must total 100%." };
    }
    const userId = await requireUserId();
    const row = clientRowFromForm(
      input,
      userId,
      existingId,
      existingPaid,
      existingCreatedAt
    );
    await persistProfitSharingClient(row, userId);
    return finish(existingId ?? row.id);
  } catch (e) {
    return {
      success: false,
      error: e instanceof Error ? e.message : "Failed to save client.",
    };
  }
}

export async function deleteClientProfile(
  id: string
): Promise<ClientProfitSharingActionResult> {
  try {
    const userId = await requireUserId();
    await removeProfitSharingClient(id, userId);
    return finish();
  } catch (e) {
    return {
      success: false,
      error: e instanceof Error ? e.message : "Failed to delete client.",
    };
  }
}

export async function toggleTradeInClientPool(
  clientId: string,
  tradeId: string,
  included: boolean
): Promise<ClientProfitSharingActionResult> {
  try {
    const userId = await requireUserId();
    const now = new Date().toISOString();
    const row: ClientTradeAllocation = {
      id: crypto.randomUUID(),
      user_id: userId,
      client_id: clientId,
      options_trade_id: tradeId,
      included_in_pool: included,
      trade_profit_loss: 0,
      my_share_amount: 0,
      client_share_amount: 0,
      status: "Open",
      created_at: now,
      updated_at: now,
    };
    await persistTradeAllocation(row, userId);
    return finish(clientId);
  } catch (e) {
    return {
      success: false,
      error: e instanceof Error ? e.message : "Failed to update allocation.",
    };
  }
}

export async function markClientAllocationPaid(
  allocationId: string
): Promise<ClientProfitSharingActionResult> {
  try {
    const userId = await requireUserId();
    await markAllocationPaid(allocationId, userId);
    return finish();
  } catch (e) {
    return {
      success: false,
      error: e instanceof Error ? e.message : "Failed to mark allocation paid.",
    };
  }
}

export async function payClient(
  clientId: string,
  amount: number
): Promise<ClientProfitSharingActionResult> {
  try {
    if (amount <= 0) {
      return { success: false, error: "Payment amount must be positive." };
    }
    const userId = await requireUserId();
    await recordClientPayment(clientId, amount, userId);
    return finish(clientId);
  } catch (e) {
    return {
      success: false,
      error: e instanceof Error ? e.message : "Failed to record payment.",
    };
  }
}
