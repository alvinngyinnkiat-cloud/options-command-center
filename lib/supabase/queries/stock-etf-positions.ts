import { mapStockEtfAdjustment, mapStockEtfTransaction } from "@/lib/stocks-etfs/map-position-history";
import type {
  EnrichedStockEtfPositionAdjustment,
  EnrichedStockEtfTransaction,
} from "@/lib/stocks-etfs/position-types";
import {
  calculatePositionFromTransactions,
  deriveCurrentValueNative,
} from "@/lib/stocks-etfs/recalculate-position";
import { toSgdAmount } from "@/lib/stocks-etfs/calculations";
import {
  addMockStockEtfAdjustment,
  addMockStockEtfTransaction,
  getMockStockEtfAdjustments,
  getMockStockEtfTransactions,
} from "@/lib/mock/stock-etf-position-store";
import { getMockStockEtfHoldings, upsertMockStockEtfHolding } from "@/lib/mock/stock-etf-store";
import { readSupabasePrimary } from "@/lib/supabase/data-access";
import { isSupabaseConfigured } from "@/lib/supabase/is-configured";
import {
  MOCK_USER_ID,
  warnMissingDevUserIdForWrite,
  withSupabaseQuery,
} from "@/lib/supabase/resolve-user";
import type {
  StockEtfHolding,
  StockEtfPositionAdjustment,
  StockEtfTransaction,
} from "@/types/database";
import type { CurrencyCode } from "@/types/database";

async function fetchHoldingById(
  holdingId: string,
  userId: string
): Promise<StockEtfHolding | null> {
  if (!isSupabaseConfigured()) {
    return getMockStockEtfHoldings().find((h) => h.id === holdingId) ?? null;
  }

  return withSupabaseQuery(
    async ({ userId: effectiveUserId, supabase }) => {
      const { data, error } = await supabase
        .from("stock_etf_holdings")
        .select("*")
        .eq("id", holdingId)
        .eq("user_id", effectiveUserId)
        .maybeSingle();
      if (error || !data) return null;
      return data as StockEtfHolding;
    },
    () => getMockStockEtfHoldings().find((h) => h.id === holdingId) ?? null
  );
}

async function fetchTransactionsForHolding(
  holdingId: string
): Promise<StockEtfTransaction[]> {
  const { value } = await readSupabasePrimary({
    module: "fetchTransactionsForHolding",
    mock: () => getMockStockEtfTransactions(holdingId),
    empty: () => [],
    read: async (userId) =>
      withSupabaseQuery(
        async ({ userId: effectiveUserId, supabase }) => {
          const { data, error } = await supabase
            .from("stock_etf_transactions")
            .select("*")
            .eq("holding_id", holdingId)
            .eq("user_id", effectiveUserId)
            .order("transaction_date", { ascending: false });

          if (error) return [];
          return (data ?? []) as StockEtfTransaction[];
        },
        () => getMockStockEtfTransactions(holdingId)
      ),
  });
  return value;
}

function applyPositionToHolding(
  holding: StockEtfHolding,
  position: { shares: number; averageCost: number; totalCost: number },
  currentValueNative: number
): StockEtfHolding {
  const currency = holding.currency as CurrencyCode;
  const fx = Number(holding.fx_rate_to_sgd);
  const totalInvestedSgd = toSgdAmount(position.totalCost, currency, fx);
  const currentValueSgd = toSgdAmount(currentValueNative, currency, fx);
  const today = new Date().toISOString().split("T")[0];

  return {
    ...holding,
    shares_held: position.shares,
    average_cost: position.averageCost,
    total_invested_native: position.totalCost,
    current_value_native: currentValueNative,
    total_invested_sgd: totalInvestedSgd,
    current_value_sgd: currentValueSgd,
    last_updated: today,
    updated_at: new Date().toISOString(),
  };
}

async function persistHoldingRow(row: StockEtfHolding): Promise<StockEtfHolding> {
  if (!isSupabaseConfigured()) {
    return upsertMockStockEtfHolding(row);
  }

  return withSupabaseQuery(
    async ({ supabase }) => {
      const { error } = await supabase
        .from("stock_etf_holdings")
        .update(row as never)
        .eq("id", row.id)
        .eq("user_id", row.user_id);

      if (error) throw new Error(error.message);
      return row;
    },
    () => upsertMockStockEtfHolding(row)
  );
}

export async function listStockEtfTransactions(
  holdingId: string
): Promise<EnrichedStockEtfTransaction[]> {
  const rows = await fetchTransactionsForHolding(holdingId);
  return rows.map(mapStockEtfTransaction);
}

export async function listStockEtfAdjustments(
  holdingId: string
): Promise<EnrichedStockEtfPositionAdjustment[]> {
  const { value } = await readSupabasePrimary({
    module: "listStockEtfAdjustments",
    mock: () => getMockStockEtfAdjustments(holdingId),
    empty: () => [],
    read: async () =>
      withSupabaseQuery(
        async ({ userId, supabase }) => {
          const { data, error } = await supabase
            .from("stock_etf_position_adjustments")
            .select("*")
            .eq("holding_id", holdingId)
            .eq("user_id", userId)
            .order("adjustment_date", { ascending: false });

          if (error) return [];
          return (data ?? []) as StockEtfPositionAdjustment[];
        },
        () => getMockStockEtfAdjustments(holdingId)
      ),
  });
  return value.map(mapStockEtfAdjustment);
}

export async function insertStockEtfTransaction(
  userId: string,
  input: {
    holdingId: string;
    transactionType: "buy" | "sell";
    transactionDate: string;
    shares: number;
    pricePerShare: number;
    fees: number;
    notes: string | null;
  }
): Promise<void> {
  const holding = await fetchHoldingById(input.holdingId, userId);
  if (!holding) throw new Error("Holding not found.");

  if (input.transactionType === "sell") {
    const currentShares = Number(holding.shares_held ?? 0);
    if (input.shares > currentShares + 0.0001) {
      throw new Error(
        `Cannot sell ${input.shares} shares — only ${currentShares} held.`
      );
    }
  }

  const totalAmount = input.shares * input.pricePerShare;
  const now = new Date().toISOString();
  const tx: StockEtfTransaction = {
    id: crypto.randomUUID(),
    user_id: userId,
    holding_id: input.holdingId,
    transaction_type: input.transactionType,
    transaction_date: input.transactionDate,
    shares: input.shares,
    price_per_share: input.pricePerShare,
    total_amount: totalAmount,
    fees: input.fees,
    notes: input.notes,
    created_at: now,
    updated_at: now,
  };

  if (!isSupabaseConfigured()) {
    addMockStockEtfTransaction(tx);
  } else {
    await withSupabaseQuery(
      async ({ userId: effectiveUserId, supabase }) => {
        const { error } = await supabase.from("stock_etf_transactions").insert({
          ...tx,
          user_id: effectiveUserId,
        } as never);
        if (error) throw new Error(error.message);
      },
      () => {
        warnMissingDevUserIdForWrite();
        addMockStockEtfTransaction({ ...tx, user_id: MOCK_USER_ID });
      }
    );
  }

  const allTx = await fetchTransactionsForHolding(input.holdingId);
  const position = calculatePositionFromTransactions(allTx);

  const previousShares = Number(holding.shares_held ?? 0);
  const previousCurrent = Number(holding.current_value_native);
  const currentValueNative = deriveCurrentValueNative(
    previousShares,
    previousCurrent,
    position.shares,
    input.pricePerShare
  );

  const updated = applyPositionToHolding(holding, position, currentValueNative);
  await persistHoldingRow(updated);
}

export async function insertStockEtfPositionAdjustment(
  userId: string,
  input: {
    holdingId: string;
    shares: number;
    averageCost: number;
    totalCost: number;
    notes: string | null;
    adjustmentReason: string;
  }
): Promise<void> {
  const holding = await fetchHoldingById(input.holdingId, userId);
  if (!holding) throw new Error("Holding not found.");

  const today = new Date().toISOString().split("T")[0];
  const adjustment: StockEtfPositionAdjustment = {
    id: crypto.randomUUID(),
    user_id: userId,
    holding_id: input.holdingId,
    adjustment_date: today,
    previous_shares: holding.shares_held,
    new_shares: input.shares,
    previous_average_cost: holding.average_cost,
    new_average_cost: input.averageCost,
    previous_total_cost: holding.total_invested_native,
    new_total_cost: input.totalCost,
    previous_notes: holding.notes,
    new_notes: input.notes,
    adjustment_reason: input.adjustmentReason.trim(),
    created_at: new Date().toISOString(),
  };

  if (!isSupabaseConfigured()) {
    addMockStockEtfAdjustment(adjustment);
  } else {
    await withSupabaseQuery(
      async ({ userId: effectiveUserId, supabase }) => {
        const { error } = await supabase
          .from("stock_etf_position_adjustments")
          .insert({ ...adjustment, user_id: effectiveUserId } as never);
        if (error) throw new Error(error.message);
      },
      () => {
        warnMissingDevUserIdForWrite();
        addMockStockEtfAdjustment({ ...adjustment, user_id: MOCK_USER_ID });
      }
    );
  }

  const previousShares = Number(holding.shares_held ?? 0);
  const previousCurrent = Number(holding.current_value_native);
  const currentValueNative = deriveCurrentValueNative(
    previousShares,
    previousCurrent,
    input.shares,
    input.averageCost
  );

  const updated = applyPositionToHolding(
    { ...holding, notes: input.notes },
    {
      shares: input.shares,
      averageCost: input.averageCost,
      totalCost: input.totalCost,
    },
    currentValueNative
  );
  await persistHoldingRow(updated);
}
