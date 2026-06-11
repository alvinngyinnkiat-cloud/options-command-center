import type { TransactionRow } from "./recalculate-position";
import { calculatePositionFromTransactions } from "./recalculate-position";

export interface TransactionPositionMetrics {
  costBasis: number;
  unrealizedPl: number;
  realizedPl: number;
  dividendIncome: number;
  totalFees: number;
  totalReturn: number;
}

function isBuyLike(type: string): boolean {
  return type === "buy" || type === "opening_balance";
}

/** Realized P/L and fees from sell transactions (weighted-average cost at time of sell). */
export function calculateRealizedPlFromTransactions(
  transactions: TransactionRow[]
): { realizedPl: number; totalFees: number; dividendIncome: number } {
  let shares = 0;
  let totalCost = 0;
  let realizedPl = 0;
  let totalFees = 0;
  let dividendIncome = 0;

  const sorted = [...transactions].sort((a, b) =>
    a.transaction_date.localeCompare(b.transaction_date)
  );

  for (const tx of sorted) {
    const txShares = Number(tx.shares);
    const fees = Number(tx.fees ?? 0);
    totalFees += fees;

    if (tx.transaction_type === "dividend") {
      dividendIncome += Number(tx.total_amount);
      continue;
    }

    if (isBuyLike(tx.transaction_type)) {
      const buyCost = Number(tx.total_amount) + fees;
      totalCost += buyCost;
      shares += txShares;
      continue;
    }

    if (tx.transaction_type === "sell" && shares > 0) {
      const sellShares = Math.min(txShares, shares);
      const avgCost = totalCost / shares;
      const proceeds = Number(tx.total_amount) - fees;
      const costRemoved = avgCost * sellShares;
      realizedPl += proceeds - costRemoved;
      shares -= sellShares;
      totalCost = avgCost * shares;
    }
  }

  return { realizedPl, totalFees, dividendIncome };
}

export function calculateTransactionPositionMetrics(input: {
  transactions: TransactionRow[];
  currentValueNative: number;
  externalDividendIncome?: number;
}): TransactionPositionMetrics {
  const position = calculatePositionFromTransactions(input.transactions);
  const { realizedPl, totalFees, dividendIncome: txDividends } =
    calculateRealizedPlFromTransactions(input.transactions);
  const dividendIncome =
    txDividends + (input.externalDividendIncome ?? 0);
  const unrealizedPl = input.currentValueNative - position.totalCost;
  const totalReturn = realizedPl + unrealizedPl + dividendIncome;

  return {
    costBasis: position.totalCost,
    unrealizedPl,
    realizedPl,
    dividendIncome,
    totalFees,
    totalReturn,
  };
}
