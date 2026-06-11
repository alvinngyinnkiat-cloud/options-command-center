import type { CryptoAssetLabel } from "./types";
import type { CryptoTransaction, CryptoTransactionType } from "@/types/database";

export const CRYPTO_TRANSACTION_LABELS: Record<CryptoTransactionType, string> = {
  deposit: "Deposit",
  monthly_contribution: "Monthly Contribution",
  buy: "Buy",
  sell: "Sell",
  fee: "Fee",
  manual_adjustment: "Manual Adjustment",
  manual_cash_update: "Manual Cash Update",
};

export function formatCryptoTransactionType(type: CryptoTransactionType): string {
  return CRYPTO_TRANSACTION_LABELS[type] ?? type;
}

export function resolveAssetLabelFromTicker(ticker: string): CryptoAssetLabel {
  const t = ticker.toUpperCase();
  if (t === "BTC") return "BTC";
  if (t === "ETH") return "ETH";
  if (t === "SOL") return "SOL";
  return "Other";
}

export function calculateTransactionNetAmount(input: {
  transactionType: CryptoTransactionType;
  amountSgd: number;
  feeSgd: number;
}): number {
  const { transactionType, amountSgd, feeSgd } = input;
  switch (transactionType) {
    case "deposit":
    case "monthly_contribution":
      return amountSgd;
    case "buy":
      return -(amountSgd + feeSgd);
    case "sell":
      return amountSgd - feeSgd;
    case "fee":
      return -feeSgd;
    case "manual_adjustment":
    case "manual_cash_update":
      return 0;
    default:
      return 0;
  }
}

export function calculateTotalFeesPaid(
  transactions: Pick<CryptoTransaction, "fee_sgd">[]
): number {
  return transactions.reduce((sum, tx) => sum + Number(tx.fee_sgd), 0);
}

export function sumContributionsFromTransactions(
  transactions: Pick<CryptoTransaction, "transaction_type" | "amount_sgd">[]
): number {
  return transactions
    .filter((tx) =>
      tx.transaction_type === "deposit" ||
      tx.transaction_type === "monthly_contribution"
    )
    .reduce((sum, tx) => sum + Number(tx.amount_sgd), 0);
}

/** Proportional cost basis release on partial sell. */
export function calculateSellCostBasisReduction(
  currentValueBefore: number,
  investedBefore: number,
  sellAmountSgd: number
): number {
  if (currentValueBefore <= 0 || sellAmountSgd <= 0) return 0;
  const ratio = Math.min(1, sellAmountSgd / currentValueBefore);
  return investedBefore * ratio;
}

export interface ManualAdjustmentMetadata {
  field: "ticker" | "coin_name" | "invested_sgd" | "current_sgd" | "notes";
  oldValue: string | number | null;
  newValue: string | number | null;
}

export interface ManualCashUpdateMetadata {
  oldCashSgd: number;
  newCashSgd: number;
  oldContributionsSgd: number;
  newContributionsSgd: number;
}
