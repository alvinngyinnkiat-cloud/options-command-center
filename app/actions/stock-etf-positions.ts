"use server";

import {
  insertStockEtfPositionAdjustment,
  insertStockEtfTransaction,
  listStockEtfAdjustments,
  listStockEtfTransactions,
} from "@/lib/supabase/queries/stock-etf-positions";
import type {
  EnrichedStockEtfPositionAdjustment,
  EnrichedStockEtfTransaction,
  StockEtfPositionActionResult,
  StockEtfPositionAdjustInput,
  StockEtfPositionHistoryResult,
  StockEtfTransactionInput,
} from "@/lib/stocks-etfs/position-types";
import { requireUserId } from "@/lib/supabase/resolve-user";
import { revalidatePath } from "next/cache";

function revalidatePortfolioPaths() {
  revalidatePath("/stocks");
  revalidatePath("/");
  revalidatePath("/goals");
}

export async function addStockEtfTransaction(
  input: StockEtfTransactionInput
): Promise<StockEtfPositionActionResult> {
  try {
    const userId = await requireUserId();
    if (input.shares <= 0) {
      return { success: false, error: "Shares must be greater than zero." };
    }
    if (input.pricePerShare < 0) {
      return { success: false, error: "Price per share cannot be negative." };
    }

    await insertStockEtfTransaction(userId, {
      holdingId: input.holdingId,
      transactionType: input.transactionType,
      transactionDate: input.transactionDate,
      shares: input.shares,
      pricePerShare: input.pricePerShare,
      fees: input.fees ?? 0,
      notes: input.notes ?? null,
    });

    revalidatePortfolioPaths();
    return { success: true };
  } catch (e) {
    return {
      success: false,
      error: e instanceof Error ? e.message : "Failed to save transaction.",
    };
  }
}

export async function adjustStockEtfPosition(
  input: StockEtfPositionAdjustInput
): Promise<StockEtfPositionActionResult> {
  try {
    const userId = await requireUserId();
    if (!input.adjustmentReason.trim()) {
      return { success: false, error: "Adjustment reason is required." };
    }
    if (input.shares < 0) {
      return { success: false, error: "Shares cannot be negative." };
    }
    if (input.totalCost < 0 || input.currentValueNative < 0) {
      return { success: false, error: "Values cannot be negative." };
    }

    await insertStockEtfPositionAdjustment(userId, {
      holdingId: input.holdingId,
      shares: input.shares,
      averageCost: input.averageCost,
      totalCost: input.totalCost,
      currentValueNative: input.currentValueNative,
      manualTotalDividend: input.manualTotalDividend,
      manualTotalFees: input.manualTotalFees,
      notes: input.notes,
      adjustmentReason: input.adjustmentReason,
    });

    revalidatePortfolioPaths();
    return { success: true };
  } catch (e) {
    return {
      success: false,
      error: e instanceof Error ? e.message : "Failed to adjust position.",
    };
  }
}

export async function getStockEtfTransactionHistory(
  holdingId: string
): Promise<StockEtfPositionHistoryResult<EnrichedStockEtfTransaction>> {
  try {
    await requireUserId();
    const data = await listStockEtfTransactions(holdingId);
    return { success: true, data };
  } catch (e) {
    return {
      success: false,
      error: e instanceof Error ? e.message : "Failed to load transactions.",
    };
  }
}

export async function getStockEtfAdjustmentHistory(
  holdingId: string
): Promise<StockEtfPositionHistoryResult<EnrichedStockEtfPositionAdjustment>> {
  try {
    await requireUserId();
    const data = await listStockEtfAdjustments(holdingId);
    return { success: true, data };
  } catch (e) {
    return {
      success: false,
      error: e instanceof Error ? e.message : "Failed to load adjustments.",
    };
  }
}
