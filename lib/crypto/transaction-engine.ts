import type { CryptoHolding } from "@/types/database";
import { calculateSellCostBasisReduction } from "./transaction-types";

export class CryptoTransactionError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "CryptoTransactionError";
  }
}

export function validateBuyTransaction(input: {
  buyAmountSgd: number;
  feeSgd: number;
}): void {
  if (input.buyAmountSgd <= 0) {
    throw new CryptoTransactionError("Buy amount must be greater than zero");
  }
}

export function validateSellTransaction(input: {
  sellAmountSgd: number;
  currentValueSgd: number;
}): void {
  if (input.sellAmountSgd <= 0) {
    throw new CryptoTransactionError("Sell amount must be greater than zero");
  }
  if (input.sellAmountSgd > input.currentValueSgd) {
    throw new CryptoTransactionError("Sell Amount Exceeds Position Value");
  }
}

export function validateFeeTransaction(input: { feeSgd: number }): void {
  if (input.feeSgd <= 0) {
    throw new CryptoTransactionError("Fee must be greater than zero");
  }
}

export function applyBuyToHolding(
  holding: Pick<CryptoHolding, "total_invested_sgd" | "current_value_sgd">,
  buyAmountSgd: number,
  feeSgd: number
): { totalInvestedSgd: number; currentValueSgd: number } {
  return {
    totalInvestedSgd: Number(holding.total_invested_sgd) + buyAmountSgd + feeSgd,
    currentValueSgd: Number(holding.current_value_sgd) + buyAmountSgd,
  };
}

export function applySellToHolding(
  holding: Pick<CryptoHolding, "total_invested_sgd" | "current_value_sgd">,
  sellAmountSgd: number
): { totalInvestedSgd: number; currentValueSgd: number } {
  const currentBefore = Number(holding.current_value_sgd);
  const investedBefore = Number(holding.total_invested_sgd);
  const costReduction = calculateSellCostBasisReduction(
    currentBefore,
    investedBefore,
    sellAmountSgd
  );
  return {
    totalInvestedSgd: Math.max(0, investedBefore - costReduction),
    currentValueSgd: Math.max(0, currentBefore - sellAmountSgd),
  };
}

export function applyCashDelta(
  cashSgd: number,
  delta: number
): number {
  return Math.max(0, cashSgd + delta);
}

export function createEmptyHoldingRow(input: {
  userId: string;
  ticker: string;
  assetLabel: string;
  buyAmountSgd: number;
  feeSgd: number;
  transactionDate: string;
  notes: string | null;
}): CryptoHolding {
  const now = new Date().toISOString();
  return {
    id: crypto.randomUUID(),
    user_id: input.userId,
    asset_label: input.assetLabel,
    ticker: input.ticker.toUpperCase(),
    total_invested_sgd: input.buyAmountSgd + input.feeSgd,
    current_value_sgd: input.buyAmountSgd,
    notes: input.notes,
    last_updated: input.transactionDate,
    created_at: now,
    updated_at: now,
  };
}
