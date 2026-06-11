import {
  applyBuyToHolding,
  applySellToHolding,
  createEmptyHoldingRow,
  CryptoTransactionError,
  validateBuyTransaction,
  validateFeeTransaction,
  validateSellTransaction,
} from "./transaction-engine";
import {
  calculateTransactionNetAmount,
  resolveAssetLabelFromTicker,
  type ManualAdjustmentMetadata,
  type ManualCashUpdateMetadata,
} from "./transaction-types";
import type {
  CryptoBuyInput,
  CryptoDepositInput,
  CryptoFeeInput,
  CryptoManualAdjustmentInput,
  CryptoSellInput,
} from "./types";
import { persistCryptoHolding, getCryptoHoldingsRows } from "@/lib/supabase/queries/crypto-holdings";
import { persistCryptoTransaction } from "@/lib/supabase/queries/crypto-transactions";
import type { CryptoHolding, CryptoTransactionType } from "@/types/database";

async function findHoldingById(
  holdingId: string,
  rows: CryptoHolding[]
): Promise<CryptoHolding | null> {
  return rows.find((r) => r.id === holdingId) ?? null;
}

async function findHoldingByTicker(
  ticker: string,
  rows: CryptoHolding[]
): Promise<CryptoHolding | null> {
  return (
    rows.find((r) => r.ticker.toUpperCase() === ticker.toUpperCase()) ?? null
  );
}

async function recordTransaction(input: {
  userId: string;
  holdingId?: string | null;
  transactionType: CryptoTransactionType;
  transactionDate: string;
  ticker?: string | null;
  coinName?: string | null;
  amountSgd: number;
  feeSgd: number;
  notes: string | null;
  metadata?: Record<string, unknown>;
}) {
  const netAmount = calculateTransactionNetAmount({
    transactionType: input.transactionType,
    amountSgd: input.amountSgd,
    feeSgd: input.feeSgd,
  });

  return persistCryptoTransaction(
    {
      user_id: input.userId,
      holding_id: input.holdingId ?? null,
      transaction_type: input.transactionType,
      transaction_date: input.transactionDate,
      ticker: input.ticker ?? null,
      coin_name: input.coinName ?? null,
      amount_sgd: input.amountSgd,
      fee_sgd: input.feeSgd,
      net_amount_sgd: netAmount,
      notes: input.notes,
      metadata: input.metadata ?? {},
    },
    input.userId
  );
}

export async function processCryptoDeposit(input: {
  userId: string;
  payload: CryptoDepositInput;
  transactionType: "deposit" | "monthly_contribution";
  cashSgd: number;
  contributionsSgd: number;
}): Promise<{ cashSgd: number; contributionsSgd: number }> {
  if (input.payload.amountSgd <= 0) {
    throw new CryptoTransactionError("Amount must be greater than zero");
  }

  await recordTransaction({
    userId: input.userId,
    transactionType: input.transactionType,
    transactionDate: input.payload.transactionDate,
    amountSgd: input.payload.amountSgd,
    feeSgd: 0,
    notes: input.payload.notes,
  });

  return {
    cashSgd: input.cashSgd,
    contributionsSgd: input.contributionsSgd,
  };
}

export async function processCryptoBuy(input: {
  userId: string;
  payload: CryptoBuyInput;
  cashSgd: number;
}): Promise<number> {
  validateBuyTransaction({
    buyAmountSgd: input.payload.buyAmountSgd,
    feeSgd: input.payload.feeSgd,
  });

  const rows = await getCryptoHoldingsRows();
  const existing = await findHoldingByTicker(input.payload.ticker, rows);
  const assetLabel = resolveAssetLabelFromTicker(input.payload.ticker);

  let holding: CryptoHolding;
  if (existing) {
    const updated = applyBuyToHolding(
      existing,
      input.payload.buyAmountSgd,
      input.payload.feeSgd
    );
    holding = {
      ...existing,
      asset_label: assetLabel,
      total_invested_sgd: updated.totalInvestedSgd,
      current_value_sgd: updated.currentValueSgd,
      last_updated: input.payload.transactionDate,
      notes: input.payload.notes ?? existing.notes,
    };
  } else {
    holding = createEmptyHoldingRow({
      userId: input.userId,
      ticker: input.payload.ticker,
      assetLabel,
      buyAmountSgd: input.payload.buyAmountSgd,
      feeSgd: input.payload.feeSgd,
      transactionDate: input.payload.transactionDate,
      notes: input.payload.notes,
    });
  }

  const saved = await persistCryptoHolding(holding, input.userId);
  await recordTransaction({
    userId: input.userId,
    holdingId: saved.id,
    transactionType: "buy",
    transactionDate: input.payload.transactionDate,
    ticker: input.payload.ticker.toUpperCase(),
    coinName: input.payload.coinName,
    amountSgd: input.payload.buyAmountSgd,
    feeSgd: input.payload.feeSgd,
    notes: input.payload.notes,
  });

  return input.cashSgd;
}

export async function processCryptoSell(input: {
  userId: string;
  payload: CryptoSellInput;
  cashSgd: number;
}): Promise<number> {
  const rows = await getCryptoHoldingsRows();
  const holding = await findHoldingById(input.payload.holdingId, rows);
  if (!holding) {
    throw new CryptoTransactionError("Holding not found");
  }

  validateSellTransaction({
    sellAmountSgd: input.payload.sellAmountSgd,
    currentValueSgd: Number(holding.current_value_sgd),
  });

  const updated = applySellToHolding(holding, input.payload.sellAmountSgd);

  await persistCryptoHolding(
    {
      ...holding,
      total_invested_sgd: updated.totalInvestedSgd,
      current_value_sgd: updated.currentValueSgd,
      last_updated: input.payload.transactionDate,
    },
    input.userId
  );

  await recordTransaction({
    userId: input.userId,
    holdingId: holding.id,
    transactionType: "sell",
    transactionDate: input.payload.transactionDate,
    ticker: holding.ticker,
    coinName: holding.asset_label,
    amountSgd: input.payload.sellAmountSgd,
    feeSgd: input.payload.feeSgd,
    notes: input.payload.notes,
  });

  return input.cashSgd;
}

export async function processCryptoFee(input: {
  userId: string;
  payload: CryptoFeeInput;
  cashSgd: number;
}): Promise<number> {
  validateFeeTransaction({
    feeSgd: input.payload.feeSgd,
  });

  await recordTransaction({
    userId: input.userId,
    transactionType: "fee",
    transactionDate: input.payload.transactionDate,
    amountSgd: input.payload.feeSgd,
    feeSgd: input.payload.feeSgd,
    notes: input.payload.notes,
  });

  return input.cashSgd;
}

export async function processCryptoManualAdjustment(input: {
  userId: string;
  payload: CryptoManualAdjustmentInput;
}): Promise<void> {
  const rows = await getCryptoHoldingsRows();
  const holding = await findHoldingById(input.payload.holdingId, rows);
  if (!holding) {
    throw new CryptoTransactionError("Holding not found");
  }

  const metadata: ManualAdjustmentMetadata[] = [];
  const pushChange = (
    field: ManualAdjustmentMetadata["field"],
    oldValue: string | number | null,
    newValue: string | number | null
  ) => {
    if (oldValue !== newValue) {
      metadata.push({ field, oldValue, newValue });
    }
  };

  pushChange("ticker", holding.ticker, input.payload.ticker.toUpperCase());
  pushChange("coin_name", holding.asset_label, input.payload.coinName);
  pushChange(
    "invested_sgd",
    Number(holding.total_invested_sgd),
    input.payload.totalInvestedSgd
  );
  pushChange(
    "current_sgd",
    Number(holding.current_value_sgd),
    input.payload.currentValueSgd
  );
  pushChange("notes", holding.notes, input.payload.notes);

  const assetLabel = resolveAssetLabelFromTicker(input.payload.ticker);
  await persistCryptoHolding(
    {
      ...holding,
      ticker: input.payload.ticker.toUpperCase(),
      asset_label: assetLabel,
      total_invested_sgd: input.payload.totalInvestedSgd,
      current_value_sgd: input.payload.currentValueSgd,
      notes: input.payload.notes,
      last_updated: input.payload.transactionDate,
    },
    input.userId
  );

  if (metadata.length > 0) {
    await recordTransaction({
      userId: input.userId,
      holdingId: holding.id,
      transactionType: "manual_adjustment",
      transactionDate: input.payload.transactionDate,
      ticker: input.payload.ticker.toUpperCase(),
      coinName: input.payload.coinName,
      amountSgd: 0,
      feeSgd: 0,
      notes: input.payload.notes,
      metadata: { changes: metadata },
    });
  }
}

export async function processCryptoManualCashUpdate(input: {
  userId: string;
  transactionDate: string;
  oldCashSgd: number;
  newCashSgd: number;
  oldContributionsSgd: number;
  newContributionsSgd: number;
  notes: string | null;
}): Promise<void> {
  const metadata: ManualCashUpdateMetadata = {
    oldCashSgd: input.oldCashSgd,
    newCashSgd: input.newCashSgd,
    oldContributionsSgd: input.oldContributionsSgd,
    newContributionsSgd: input.newContributionsSgd,
  };

  await recordTransaction({
    userId: input.userId,
    transactionType: "manual_cash_update",
    transactionDate: input.transactionDate,
    amountSgd: 0,
    feeSgd: 0,
    notes: input.notes,
    metadata: metadata as unknown as Record<string, unknown>,
  });
}

export { CryptoTransactionError };
