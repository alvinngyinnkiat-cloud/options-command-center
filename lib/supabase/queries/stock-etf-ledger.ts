import { calculateLedgerNetAmount } from "@/lib/stocks-etfs/cash-balances";
import {
  deleteMockStockEtfLedgerEntry,
  getMockStockEtfLedger,
  insertMockStockEtfLedgerEntry,
} from "@/lib/mock/stock-etf-cash-store";
import { readSupabasePrimary } from "@/lib/supabase/data-access";
import { isSupabaseConfigured } from "@/lib/supabase/is-configured";
import {
  MOCK_USER_ID,
  warnMissingDevUserIdForWrite,
  withSupabaseQuery,
} from "@/lib/supabase/resolve-user";
import type {
  StockEtfLedgerEntry,
  StockEtfLedgerEntryInsert,
  StockEtfLedgerTransactionType,
} from "@/types/database";
import type { MarketCategory } from "@/lib/stocks-etfs/market-category";
import type { CurrencyCode } from "@/types/database";

export async function listStockEtfLedgerEntries(): Promise<StockEtfLedgerEntry[]> {
  const { value } = await readSupabasePrimary({
    module: "listStockEtfLedgerEntries",
    mock: () => getMockStockEtfLedger(),
    empty: () => [],
    read: async (userId) =>
      withSupabaseQuery(
        async ({ userId: effectiveUserId, supabase }) => {
          const { data, error } = await supabase
            .from("stock_etf_ledger")
            .select("*")
            .eq("user_id", effectiveUserId)
            .order("transaction_date", { ascending: false })
            .order("created_at", { ascending: false });

          if (error) return [];
          return (data ?? []) as StockEtfLedgerEntry[];
        },
        () => getMockStockEtfLedger()
      ),
  });
  return value;
}

export async function insertStockEtfLedgerEntry(
  userId: string,
  input: {
    holdingId?: string | null;
    marketCategory: MarketCategory;
    transactionType: StockEtfLedgerTransactionType;
    transactionDate: string;
    ticker?: string | null;
    shares?: number | null;
    amountNative: number;
    feeNative: number;
    currency: CurrencyCode;
    fxRateToSgd?: number | null;
    notes?: string | null;
    metadata?: Record<string, unknown>;
  }
): Promise<StockEtfLedgerEntry> {
  const now = new Date().toISOString();
  const netAmount = calculateLedgerNetAmount({
    transactionType: input.transactionType,
    amountNative: input.amountNative,
    feeNative: input.feeNative,
  });

  const row: StockEtfLedgerEntry = {
    id: crypto.randomUUID(),
    user_id: userId,
    holding_id: input.holdingId ?? null,
    market_category: input.marketCategory,
    transaction_type: input.transactionType,
    transaction_date: input.transactionDate,
    ticker: input.ticker ?? null,
    shares: input.shares ?? null,
    amount_native: input.amountNative,
    fee_native: input.feeNative,
    net_amount_native: netAmount,
    currency: input.currency,
    fx_rate_to_sgd: input.fxRateToSgd ?? null,
    notes: input.notes ?? null,
    metadata: input.metadata ?? {},
    created_at: now,
    updated_at: now,
  };

  if (!isSupabaseConfigured()) {
    return insertMockStockEtfLedgerEntry(row);
  }

  return withSupabaseQuery(
    async ({ userId: effectiveUserId, supabase }) => {
      const payload = { ...row, user_id: effectiveUserId };
      const { error } = await supabase
        .from("stock_etf_ledger")
        .insert(payload as never);
      if (error) throw new Error(error.message);
      return payload;
    },
    () => {
      warnMissingDevUserIdForWrite();
      return insertMockStockEtfLedgerEntry({ ...row, user_id: MOCK_USER_ID });
    }
  );
}

export async function removeStockEtfLedgerEntry(
  id: string,
  userId?: string
): Promise<void> {
  if (!isSupabaseConfigured()) {
    deleteMockStockEtfLedgerEntry(id);
    return;
  }

  await withSupabaseQuery(
    async ({ userId: effectiveUserId, supabase }) => {
      const { error } = await supabase
        .from("stock_etf_ledger")
        .delete()
        .eq("id", id)
        .eq("user_id", effectiveUserId);
      if (error) throw new Error(error.message);
    },
    () => {
      warnMissingDevUserIdForWrite();
      deleteMockStockEtfLedgerEntry(id);
    }
  );
}

export async function removeStockEtfLedgerEntriesForHolding(
  holdingId: string,
  userId?: string
): Promise<void> {
  if (!isSupabaseConfigured()) {
    const { deleteMockStockEtfLedgerForHolding } = await import(
      "@/lib/mock/stock-etf-cash-store"
    );
    deleteMockStockEtfLedgerForHolding(holdingId);
    return;
  }

  await withSupabaseQuery(
    async ({ userId: effectiveUserId, supabase }) => {
      const { error } = await supabase
        .from("stock_etf_ledger")
        .delete()
        .eq("holding_id", holdingId)
        .eq("user_id", effectiveUserId);
      if (error) throw new Error(error.message);
    },
    () => {
      warnMissingDevUserIdForWrite();
    }
  );
}
