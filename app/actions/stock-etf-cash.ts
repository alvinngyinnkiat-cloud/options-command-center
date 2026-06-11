"use server";

import { cashByCategory } from "@/lib/stocks-etfs/cash-balances";
import type { MarketCategory } from "@/lib/stocks-etfs/market-category";
import { insertStockEtfTransaction } from "@/lib/supabase/queries/stock-etf-positions";
import { MARKET_CASH_CURRENCY } from "@/lib/stocks-etfs/cash-balances";
import type { StockEtfActionResult } from "@/lib/stocks-etfs/types";
import {
  getStockEtfCashBalances,
  updateStockEtfCashForCategory,
} from "@/lib/supabase/queries/stock-etf-cash";
import { insertStockEtfLedgerEntry } from "@/lib/supabase/queries/stock-etf-ledger";
import {
  ensureStockEtfHoldingForBuy,
  getStockEtfTrackerData,
} from "@/lib/supabase/queries/stock-etf-holdings";
import { isSupabaseConfigured } from "@/lib/supabase/is-configured";
import { MOCK_PORTFOLIO_OVERRIDE } from "@/lib/mock/portfolio";
import {
  portfolioTradingCashTotals,
  tradingCashFromStoredBalances,
} from "@/lib/stocks-etfs/trading-cash-sync";
import {
  NotAuthenticatedError,
  requireUserId,
  resolveSupabaseServerAccess,
} from "@/lib/supabase/resolve-user";
import { getServerSupabaseClient } from "@/lib/supabase/server-write";
import type { PortfolioOverride } from "@/types/database";
import { revalidatePath } from "next/cache";

async function finish(): Promise<StockEtfActionResult> {
  const data = await getStockEtfTrackerData();
  revalidatePath("/stocks");
  revalidatePath("/");
  revalidatePath("/goals");
  return { success: true, data };
}

export async function recordStockEtfMonthlyContribution(input: {
  marketCategory: MarketCategory;
  transactionDate: string;
  amountNative: number;
  fxRateToSgd?: number | null;
  notes?: string | null;
}): Promise<StockEtfActionResult> {
  try {
    const userId = await requireUserId();
    if (input.amountNative <= 0) {
      return { success: false, error: "Amount must be greater than zero." };
    }

    const rows = await getStockEtfCashBalances(userId);
    const current = cashByCategory(rows)[input.marketCategory];
    const next = current + input.amountNative;
    await updateStockEtfCashForCategory(userId, input.marketCategory, next);

    await insertStockEtfLedgerEntry(userId, {
      marketCategory: input.marketCategory,
      transactionType: "monthly_contribution",
      transactionDate: input.transactionDate,
      amountNative: input.amountNative,
      feeNative: 0,
      currency: MARKET_CASH_CURRENCY[input.marketCategory],
      fxRateToSgd: input.fxRateToSgd ?? null,
      notes: input.notes ?? null,
    });

    return finish();
  } catch (e) {
    return {
      success: false,
      error: e instanceof Error ? e.message : "Failed to record contribution.",
    };
  }
}

export async function syncStockEtfCashFromPortfolio(input: {
  usEtfCashUsd: number;
  usStockCashUsd: number;
  sgStockCashSgd: number;
  notes?: string | null;
}): Promise<StockEtfActionResult> {
  try {
    const userId = await requireUserId();
    const today = new Date().toISOString().split("T")[0];
    const rows = await getStockEtfCashBalances(userId);
    const previous = cashByCategory(rows);

    const updates: {
      category: MarketCategory;
      next: number;
      currency: "USD" | "SGD";
    }[] = [
      { category: "us_etf", next: input.usEtfCashUsd, currency: "USD" },
      { category: "us_stock", next: input.usStockCashUsd, currency: "USD" },
      { category: "sg_stock", next: input.sgStockCashSgd, currency: "SGD" },
    ];

    for (const u of updates) {
      await updateStockEtfCashForCategory(userId, u.category, u.next);
      if (previous[u.category] !== u.next) {
        await insertStockEtfLedgerEntry(userId, {
          marketCategory: u.category,
          transactionType: "manual_cash_sync",
          transactionDate: today,
          amountNative: u.next,
          feeNative: 0,
          currency: u.currency,
          notes: input.notes ?? null,
          metadata: {
            oldCashNative: previous[u.category],
            newCashNative: u.next,
          },
        });
      }
    }

    return finish();
  } catch (e) {
    return {
      success: false,
      error: e instanceof Error ? e.message : "Failed to sync cash balances.",
    };
  }
}

export async function getStockEtfCashSyncPreview(): Promise<
  | {
      usEtfCashUsd: number;
      usStockCashUsd: number;
      sgStockCashSgd: number;
      tradingCashUsd: number;
      tradingCashSgd: number;
    }
  | { error: string }
> {
  try {
    const userId = await requireUserId();

    if (!isSupabaseConfigured()) {
      const stored = tradingCashFromStoredBalances(
        cashByCategory(await getStockEtfCashBalances(userId))
      );
      const portfolio = portfolioTradingCashTotals(MOCK_PORTFOLIO_OVERRIDE);
      return {
        usEtfCashUsd: stored.us_etf,
        usStockCashUsd: stored.us_stock,
        sgStockCashSgd: stored.sg_stock,
        ...portfolio,
      };
    }

    const access = await resolveSupabaseServerAccess();
    if (!access) throw new NotAuthenticatedError("Authentication required.");
    const supabase = await getServerSupabaseClient(access);
    const [{ data }, storedRows] = await Promise.all([
      supabase
        .from("portfolio_overrides")
        .select("manual_trading_cash_usd, manual_trading_cash_sgd")
        .eq("user_id", access.userId)
        .maybeSingle(),
      getStockEtfCashBalances(access.userId),
    ]);

    const row = data as PortfolioOverride | null;
    const stored = tradingCashFromStoredBalances(cashByCategory(storedRows));
    const portfolio = portfolioTradingCashTotals(row);

    return {
      usEtfCashUsd: stored.us_etf,
      usStockCashUsd: stored.us_stock,
      sgStockCashSgd: stored.sg_stock,
      ...portfolio,
    };
  } catch (e) {
    return {
      error: e instanceof Error ? e.message : "Failed to load sync preview.",
    };
  }
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
