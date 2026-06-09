"use server";

import {
  enrichOptionsTradeRow,
  getOptionsTradeRow,
  getOptionsTradesData,
  persistOptionsTrade,
  removeOptionsTrade,
} from "@/lib/supabase/queries/options-trades";
import { ensureWatchlistIdForTicker } from "@/lib/supabase/queries/watchlist-resolve";
import {
  removeTradeAllocation,
  syncClientTradeAllocation,
} from "@/lib/supabase/queries/client-profit-sharing";
import {
  applyCurrentValueUpdate,
  tradeFormInputFromEnriched,
  tradeRowFromForm,
} from "@/lib/trades/map-trade";
import { calculateExitDebitTotal } from "@/lib/trades/exit-debit";
import {
  formatActionError,
  serializeServerActionPayload,
} from "@/lib/trades/server-action-response";
import type {
  TradeActionResult,
  TradeFormInput,
  UpdateCurrentValueInput,
  UpdateCurrentValueResult,
} from "@/lib/trades/types";
import {
  findActiveTradeForTicker,
  toActiveTradeConflict,
} from "@/lib/trading-workflow/one-trade-per-ticker";
import { isSupabaseConfigured } from "@/lib/supabase/is-configured";
import { requireUserId } from "@/lib/supabase/resolve-user";
import { revalidatePath } from "next/cache";
import { refreshMarketDataHealth } from "@/app/actions/data-health";

async function finish(): Promise<TradeActionResult> {
  const data = await getOptionsTradesData();
  revalidatePath("/trades");
  revalidatePath("/");
  revalidatePath("/client-profit-sharing");
  return { success: true, data };
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
  const watchlistId = await ensureWatchlistIdForTicker(userId, input.ticker);
  const resolvedInput: TradeFormInput = {
    ...input,
    ticker: input.ticker.toUpperCase(),
    watchlistId,
  };

  const existingRow = existingId
    ? await getOptionsTradeRow(existingId, userId)
    : null;
  const row = tradeRowFromForm(resolvedInput, userId, existingId, existingRow);
  await persistOptionsTrade(row, userId);
  await syncClientTradeAllocation(row, userId);
  return row;
}

export async function refreshUnderlyingPrices(): Promise<TradeActionResult> {
  try {
    const refresh = await refreshMarketDataHealth();
    if (!refresh.success) {
      return { success: false, error: refresh.error };
    }
    return finish();
  } catch (e) {
    return {
      success: false,
      error:
        e instanceof Error ? e.message : "Failed to refresh underlying prices.",
    };
  }
}

export async function updateTradeCurrentValue(
  tradeId: string,
  input: UpdateCurrentValueInput
): Promise<UpdateCurrentValueResult> {
  try {
    const userId = await requireUserId();
    const existing = await getOptionsTradeRow(tradeId, userId);
    if (!existing) {
      return { ok: false, error: "Trade not found." };
    }

    if (
      input.currentOptionValue != null &&
      (!Number.isFinite(input.currentOptionValue) ||
        input.currentOptionValue < 0)
    ) {
      return {
        ok: false,
        error: "Current option value must be zero or greater.",
      };
    }

    const row = applyCurrentValueUpdate(existing, input);

    try {
      await persistOptionsTrade(row, userId);
    } catch (persistError) {
      return { ok: false, error: formatActionError(persistError) };
    }

    const dataSource = isSupabaseConfigured() ? "supabase" : "mock";
    const trade = await enrichOptionsTradeRow(row, dataSource, userId);

    revalidatePath("/trades");
    revalidatePath("/risk");

    return {
      ok: true,
      trade: serializeServerActionPayload(trade),
    };
  } catch (error) {
    return { ok: false, error: formatActionError(error) };
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

    const userId = await requireUserId();
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

    const userId = await requireUserId();
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
  exitDebitPerContract: number,
  feesCommission = 0
): Promise<TradeActionResult> {
  try {
    const data = await getOptionsTradesData();
    const trade = data.trades.find((t) => t.id === tradeId);
    if (!trade) return { success: false, error: "Trade not found." };

    if (!Number.isFinite(exitDebitPerContract) || exitDebitPerContract < 0) {
      return {
        success: false,
        error: "Closing debit per contract must be zero or greater.",
      };
    }

    const userId = await requireUserId();
    const input = tradeFormInputFromEnriched(trade);
    input.status = "closed";
    input.currentValue = 0;
    input.exitDebit = calculateExitDebitTotal(
      exitDebitPerContract,
      input.contracts
    );
    input.feesCommission = Math.max(0, feesCommission);
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

    const userId = await requireUserId();
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
    const userId = await requireUserId();
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
