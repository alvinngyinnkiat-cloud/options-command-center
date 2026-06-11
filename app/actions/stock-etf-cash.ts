"use server";

import { insertStockEtfTransaction } from "@/lib/supabase/queries/stock-etf-positions";
import type { MarketCategory } from "@/lib/stocks-etfs/market-category";
import { classifyHoldingCategory } from "@/lib/stocks-etfs/market-category";
import { enrichStockEtfHolding } from "@/lib/stocks-etfs/map-holding";
import type { StockEtfActionResult } from "@/lib/stocks-etfs/types";
import {
  ensureStockEtfHoldingForBuy,
  getStockEtfHoldingsRows,
  getStockEtfTrackerData,
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

export async function deleteStockEtfLedgerEntry(
  id: string
): Promise<StockEtfActionResult> {
  try {
    const userId = await requireUserId();
    const { removeStockEtfLedgerEntry } = await import(
      "@/lib/supabase/queries/stock-etf-ledger"
    );
    await removeStockEtfLedgerEntry(id, userId);
    return finish();
  } catch (e) {
    return {
      success: false,
      error: e instanceof Error ? e.message : "Failed to delete ledger entry.",
    };
  }
}

export async function recordStockEtfBuy(input: {
  marketCategory: MarketCategory;
  transactionDate: string;
  ticker: string;
  shares: number;
  pricePerShare: number;
  fees: number;
  fxRateToSgd?: number | null;
  notes?: string | null;
}): Promise<StockEtfActionResult> {
  try {
    const userId = await requireUserId();
    if (input.shares <= 0) {
      return { success: false, error: "Shares must be greater than zero." };
    }
    if (input.pricePerShare < 0) {
      return { success: false, error: "Price per share cannot be negative." };
    }

    const holding = await ensureStockEtfHoldingForBuy(userId, {
      marketCategory: input.marketCategory,
      ticker: input.ticker,
      fxRateToSgd: input.fxRateToSgd ?? undefined,
    });

    await insertStockEtfTransaction(userId, {
      holdingId: holding.id,
      transactionType: "buy",
      transactionDate: input.transactionDate,
      shares: input.shares,
      pricePerShare: input.pricePerShare,
      fees: input.fees ?? 0,
      notes: input.notes ?? null,
    });

    return finish();
  } catch (e) {
    return {
      success: false,
      error: e instanceof Error ? e.message : "Failed to record buy.",
    };
  }
}

export async function recordStockEtfSell(input: {
  marketCategory: MarketCategory;
  transactionDate: string;
  ticker: string;
  shares: number;
  pricePerShare: number;
  fees: number;
  fxRateToSgd?: number | null;
  notes?: string | null;
}): Promise<StockEtfActionResult> {
  try {
    const userId = await requireUserId();
    if (input.shares <= 0) {
      return { success: false, error: "Shares must be greater than zero." };
    }
    if (input.pricePerShare < 0) {
      return { success: false, error: "Price per share cannot be negative." };
    }

    const rows = await getStockEtfHoldingsRows();
    const ticker = input.ticker.toUpperCase();
    const holding = rows.find((r) => r.ticker === ticker);
    if (!holding) {
      return {
        success: false,
        error: `No position found for ${ticker}. Record buys first.`,
      };
    }

    const enriched = enrichStockEtfHolding(holding, 0);
    const category = classifyHoldingCategory(enriched);
    if (category !== input.marketCategory) {
      return {
        success: false,
        error: `${ticker} is tracked as ${category.replace("_", " ")} — use that market type.`,
      };
    }

    await insertStockEtfTransaction(userId, {
      holdingId: holding.id,
      transactionType: "sell",
      transactionDate: input.transactionDate,
      shares: input.shares,
      pricePerShare: input.pricePerShare,
      fees: input.fees ?? 0,
      notes: input.notes ?? null,
    });

    return finish();
  } catch (e) {
    return {
      success: false,
      error: e instanceof Error ? e.message : "Failed to record sell.",
    };
  }
}
