"use server";

import {
  getOptionsTradeRow,
  getOptionsTradesData,
  persistOptionsTrade,
  removeOptionsTrade,
} from "@/lib/supabase/queries/options-trades";
import {
  removeTradeAllocation,
  syncClientTradeAllocation,
} from "@/lib/supabase/queries/client-profit-sharing";
import {
  applyCurrentValueUpdate,
  tradeFormInputFromEnriched,
  tradeRowFromForm,
} from "@/lib/trades/map-trade";
import type {
  TradeActionResult,
  TradeFormInput,
  UpdateCurrentValueInput,
} from "@/lib/trades/types";
import {
  findActiveTradeForTicker,
  toActiveTradeConflict,
} from "@/lib/trading-workflow/one-trade-per-ticker";
import { isSupabaseConfigured } from "@/lib/supabase/is-configured";
import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

async function finish(): Promise<TradeActionResult> {
  const data = await getOptionsTradesData();
  revalidatePath("/trades");
  revalidatePath("/");
  revalidatePath("/client-profit-sharing");
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

function validateClientTradeInput(input: TradeFormInput): string | null {
  if (input.tradeOwnership !== "client_profit_sharing") return null;
  if (!input.clientId) {
    return "Select a client for Client Profit Sharing trades.";
  }
  if (input.myProfitSharePercent + input.clientProfitSharePercent !== 100) {
    return "My share and client share must total 100%.";
  }
  return null;
}

async function persistTradeWithAllocation(
  input: TradeFormInput,
  userId: string,
  existingId?: string
) {
  const existingRow = existingId
    ? await getOptionsTradeRow(existingId, userId)
    : null;
  const row = tradeRowFromForm(input, userId, existingId, existingRow);
  await persistOptionsTrade(row, userId);
  await syncClientTradeAllocation(row, userId);
  return row;
}

export async function updateTradeCurrentValue(
  tradeId: string,
  input: UpdateCurrentValueInput
): Promise<TradeActionResult> {
  try {
    const userId = (await resolveUserId()) ?? "mock-user";
    const existing = await getOptionsTradeRow(tradeId, userId);
    if (!existing) {
      return { success: false, error: "Trade not found." };
    }

    const row = applyCurrentValueUpdate(existing, input);
    await persistOptionsTrade(row, userId);
    revalidatePath("/risk");
    return finish();
  } catch (e) {
    return {
      success: false,
      error:
        e instanceof Error ? e.message : "Failed to update current value.",
    };
  }
}

export async function createOptionsTrade(
  input: TradeFormInput
): Promise<TradeActionResult> {
  try {
    const clientErr = validateClientTradeInput(input);
    if (clientErr) return { success: false, error: clientErr };

    const existingData = await getOptionsTradesData();
    const conflict = findActiveTradeForTicker(
      existingData.trades,
      input.ticker
    );
    if (conflict && !input.allowDuplicateOverride) {
      const info = toActiveTradeConflict(conflict);
      return {
        success: false,
        error: `This ticker already has an active trade. ${info.strategy} · Exp ${info.expiryDate} · Risk $${info.maxRisk} · P/L $${info.currentPnl} · ${info.status}. Enable override to proceed.`,
      };
    }

    const userId = (await resolveUserId()) ?? "mock-user";
    await persistTradeWithAllocation(input, userId);
    revalidatePath("/trade-queue");
    revalidatePath("/risk");
    return finish();
  } catch (e) {
    return {
      success: false,
      error: e instanceof Error ? e.message : "Failed to create trade.",
    };
  }
}

export async function updateOptionsTrade(
  tradeId: string,
  input: TradeFormInput
): Promise<TradeActionResult> {
  try {
    const clientErr = validateClientTradeInput(input);
    if (clientErr) return { success: false, error: clientErr };

    const userId = (await resolveUserId()) ?? "mock-user";
    await persistTradeWithAllocation(input, userId, tradeId);
    return finish();
  } catch (e) {
    return {
      success: false,
      error: e instanceof Error ? e.message : "Failed to update trade.",
    };
  }
}

export async function closeOptionsTrade(
  tradeId: string,
  exitDebit: number
): Promise<TradeActionResult> {
  try {
    const data = await getOptionsTradesData();
    const trade = data.trades.find((t) => t.id === tradeId);
    if (!trade) return { success: false, error: "Trade not found." };

    const userId = (await resolveUserId()) ?? "mock-user";
    const input = tradeFormInputFromEnriched(trade);
    input.status = "closed";
    input.currentValue = 0;
    input.exitDebit = exitDebit;
    await persistTradeWithAllocation(input, userId, tradeId);
    return finish();
  } catch (e) {
    return {
      success: false,
      error: e instanceof Error ? e.message : "Failed to close trade.",
    };
  }
}

export async function markTradeManaged(
  tradeId: string
): Promise<TradeActionResult> {
  return updateTradeStatus(tradeId, "managed");
}

export async function markTradeRolled(
  tradeId: string
): Promise<TradeActionResult> {
  return updateTradeStatus(tradeId, "rolled");
}

async function updateTradeStatus(
  tradeId: string,
  status: "managed" | "rolled"
): Promise<TradeActionResult> {
  try {
    const data = await getOptionsTradesData();
    const trade = data.trades.find((t) => t.id === tradeId);
    if (!trade) return { success: false, error: "Trade not found." };

    const userId = (await resolveUserId()) ?? "mock-user";
    const input = tradeFormInputFromEnriched(trade);
    input.status = status;
    await persistTradeWithAllocation(input, userId, tradeId);
    return finish();
  } catch (e) {
    return {
      success: false,
      error: e instanceof Error ? e.message : "Failed to update trade status.",
    };
  }
}

export async function checkActiveTradeForTicker(ticker: string) {
  const data = await getOptionsTradesData();
  const conflict = findActiveTradeForTicker(data.trades, ticker);
  return conflict ? toActiveTradeConflict(conflict) : null;
}

export async function deleteOptionsTrade(
  tradeId: string
): Promise<TradeActionResult> {
  try {
    const userId = (await resolveUserId()) ?? "mock-user";
    await removeTradeAllocation(tradeId, userId);
    await removeOptionsTrade(tradeId, userId);
    return finish();
  } catch (e) {
    return {
      success: false,
      error: e instanceof Error ? e.message : "Failed to delete trade.",
    };
  }
}
