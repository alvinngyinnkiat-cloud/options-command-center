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
  StockEtfFieldAdjustInput,
  StockEtfFieldAdjusted,
  StockEtfPositionActionResult,
  StockEtfPositionAdjustInput,
  StockEtfPositionHistoryResult,
  StockEtfTransactionInput,
} from "@/lib/stocks-etfs/position-types";
import { enrichStockEtfHolding } from "@/lib/stocks-etfs/map-holding";
import {
  getStockEtfHoldingsRows,
  getStockEtfTrackerData,
} from "@/lib/supabase/queries/stock-etf-holdings";
import type { StockEtfActionResult } from "@/lib/stocks-etfs/types";
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
      adjustmentDate: input.adjustmentDate,
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

const FIELD_LABELS: Record<StockEtfFieldAdjusted, string> = {
  shares: "share count",
  capital_invested: "capital invested",
  current_value: "current value",
  dividend: "total dividend",
  fees: "total fees",
  pl: "P/L",
};

function fieldOldValue(
  holding: Awaited<ReturnType<typeof getStockEtfHoldingsRows>>[number],
  enriched: ReturnType<typeof enrichStockEtfHolding>,
  field: StockEtfFieldAdjusted
): number {
  const capital = Number(holding.total_invested_native);
  const current = enriched.currentValueNative;
  switch (field) {
    case "shares":
      return Number(holding.shares_held ?? 0);
    case "capital_invested":
      return capital;
    case "current_value":
      return current;
    case "dividend":
      return enriched.manualTotalDividend;
    case "fees":
      return enriched.manualTotalFees;
    case "pl":
      return current - capital;
  }
}

export async function recordStockEtfFieldAdjustment(
  input: StockEtfFieldAdjustInput
): Promise<StockEtfActionResult> {
  try {
    const userId = await requireUserId();
    const ticker = input.ticker.toUpperCase().trim();
    if (!ticker) {
      return { success: false, error: "Ticker is required." };
    }

    const rows = await getStockEtfHoldingsRows();
    const holding = rows.find((row) => row.ticker === ticker);
    if (!holding) {
      return {
        success: false,
        error: `No position found for ${ticker}. Record buys first.`,
      };
    }

    const enriched = enrichStockEtfHolding(holding, 0);
    const oldValue = fieldOldValue(holding, enriched, input.field);
    const shares = Number(holding.shares_held ?? 0);
    const capital = Number(holding.total_invested_native);
    const current = enriched.currentValueNative;
    const dividend = enriched.manualTotalDividend;
    const fees = enriched.manualTotalFees;

    let nextShares = shares;
    let nextCapital = capital;
    let nextCurrent = current;
    let nextDividend = dividend;
    let nextFees = fees;

    switch (input.field) {
      case "shares":
        if (input.newValue < 0) {
          return { success: false, error: "Shares cannot be negative." };
        }
        nextShares = input.newValue;
        break;
      case "capital_invested":
        if (input.newValue < 0) {
          return { success: false, error: "Capital invested cannot be negative." };
        }
        nextCapital = input.newValue;
        break;
      case "current_value":
        if (input.newValue < 0) {
          return { success: false, error: "Current value cannot be negative." };
        }
        nextCurrent = input.newValue;
        break;
      case "dividend":
        if (input.newValue < 0) {
          return { success: false, error: "Dividend cannot be negative." };
        }
        nextDividend = input.newValue;
        break;
      case "fees":
        if (input.newValue < 0) {
          return { success: false, error: "Fees cannot be negative." };
        }
        nextFees = input.newValue;
        break;
      case "pl":
        nextCurrent = capital + input.newValue;
        break;
    }

    const averageCost =
      nextShares > 0
        ? nextCapital / nextShares
        : Number(holding.average_cost ?? 0);
    const reason = `Corrected ${FIELD_LABELS[input.field]}: ${oldValue} → ${input.newValue}`;

    await insertStockEtfPositionAdjustment(userId, {
      holdingId: holding.id,
      shares: nextShares,
      averageCost,
      totalCost: nextCapital,
      currentValueNative: nextCurrent,
      manualTotalDividend: nextDividend,
      manualTotalFees: nextFees,
      notes: input.notes ?? holding.notes,
      adjustmentReason: reason,
      adjustmentDate: input.adjustmentDate,
    });

    revalidatePortfolioPaths();
    const data = await getStockEtfTrackerData();
    return { success: true, data };
  } catch (e) {
    return {
      success: false,
      error: e instanceof Error ? e.message : "Failed to save adjustment.",
    };
  }
}
