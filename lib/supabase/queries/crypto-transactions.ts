import {
  deleteMockCryptoTransaction,
  getMockCryptoTransactions,
  insertMockCryptoTransaction,
} from "@/lib/mock/crypto-transaction-store";
import { isSupabaseConfigured } from "@/lib/supabase/is-configured";
import {
  MOCK_USER_ID,
  warnMissingDevUserIdForWrite,
  withSupabaseQuery,
} from "@/lib/supabase/resolve-user";
import type { CryptoTransaction, CryptoTransactionInsert } from "@/types/database";

export async function fetchCryptoTransactions(
  userId?: string
): Promise<CryptoTransaction[]> {
  if (!isSupabaseConfigured()) {
    return getMockCryptoTransactions();
  }

  return withSupabaseQuery(
    async ({ userId: effectiveUserId, supabase }) => {
      const { data, error } = await supabase
        .from("crypto_transactions")
        .select("*")
        .eq("user_id", effectiveUserId)
        .order("transaction_date", { ascending: false })
        .order("created_at", { ascending: false });

      if (error) return [];
      return (data ?? []) as CryptoTransaction[];
    },
    () => []
  );
}

export async function persistCryptoTransaction(
  row: CryptoTransactionInsert,
  userId?: string
): Promise<CryptoTransaction> {
  const now = new Date().toISOString();
  const payload: CryptoTransaction = {
    id: row.id ?? crypto.randomUUID(),
    user_id: userId ?? row.user_id,
    holding_id: row.holding_id ?? null,
    transaction_type: row.transaction_type,
    transaction_date: row.transaction_date,
    ticker: row.ticker ?? null,
    coin_name: row.coin_name ?? null,
    amount_sgd: row.amount_sgd,
    fee_sgd: row.fee_sgd,
    net_amount_sgd: row.net_amount_sgd,
    notes: row.notes ?? null,
    metadata: row.metadata ?? {},
    created_at: row.created_at ?? now,
    updated_at: now,
  };

  if (!isSupabaseConfigured()) {
    return insertMockCryptoTransaction(payload);
  }

  return withSupabaseQuery(
    async ({ userId: effectiveUserId, supabase }) => {
      const insertPayload = { ...payload, user_id: effectiveUserId };
      const { error } = await supabase
        .from("crypto_transactions")
        .insert(insertPayload as never);

      if (error) throw new Error(error.message);
      return insertPayload;
    },
    () => {
      warnMissingDevUserIdForWrite();
      return insertMockCryptoTransaction({ ...payload, user_id: MOCK_USER_ID });
    }
  );
}

export async function removeCryptoTransaction(
  id: string,
  userId?: string
): Promise<void> {
  if (!isSupabaseConfigured()) {
    deleteMockCryptoTransaction(id);
    return;
  }

  await withSupabaseQuery(
    async ({ userId: effectiveUserId, supabase }) => {
      const { error } = await supabase
        .from("crypto_transactions")
        .delete()
        .eq("id", id)
        .eq("user_id", effectiveUserId);

      if (error) throw new Error(error.message);
    },
    () => {
      warnMissingDevUserIdForWrite();
      deleteMockCryptoTransaction(id);
    }
  );
}
