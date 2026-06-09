import type {
  PositionFromTransactions,
  StockEtfTransactionType,
} from "./position-types";

export interface TransactionRow {
  transaction_type: StockEtfTransactionType;
  transaction_date: string;
  shares: number;
  price_per_share: number;
  total_amount: number;
  fees: number;
}

/** Weighted-average cost basis from immutable buy/sell transactions. */
export function calculatePositionFromTransactions(
  transactions: TransactionRow[]
): PositionFromTransactions {
  let shares = 0;
  let totalCost = 0;

  const sorted = [...transactions].sort((a, b) =>
    a.transaction_date.localeCompare(b.transaction_date)
  );

  for (const tx of sorted) {
    const txShares = Number(tx.shares);
    const fees = Number(tx.fees ?? 0);

    if (tx.transaction_type === "buy") {
      const buyCost = Number(tx.total_amount) + fees;
      totalCost += buyCost;
      shares += txShares;
      continue;
    }

    if (shares <= 0) continue;
    const sellShares = Math.min(txShares, shares);
    const avgCost = totalCost / shares;
    shares -= sellShares;
    totalCost = avgCost * shares;
  }

  const averageCost = shares > 0 ? totalCost / shares : 0;
  return {
    shares: Math.max(0, shares),
    averageCost,
    totalCost: Math.max(0, totalCost),
  };
}

export function deriveCurrentValueNative(
  previousShares: number,
  previousCurrentValue: number,
  newShares: number,
  fallbackPricePerShare: number
): number {
  if (newShares <= 0) return 0;
  if (previousShares > 0 && previousCurrentValue > 0) {
    const pricePerShare = previousCurrentValue / previousShares;
    return newShares * pricePerShare;
  }
  return newShares * fallbackPricePerShare;
}
