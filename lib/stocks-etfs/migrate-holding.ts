import type { StockEtfHolding, StockEtfTransaction } from "@/types/database";

export interface OpeningBalanceInput {
  shares: number;
  pricePerShare: number;
  totalAmount: number;
  fees: number;
  dividendAmount: number;
  transactionDate: string;
}

/** Build opening-balance + optional dividend transactions from a manual holding. */
export function buildMigrationTransactions(
  holding: StockEtfHolding,
  userId: string
): StockEtfTransaction[] {
  const now = new Date().toISOString();
  const today = now.split("T")[0];
  const shares = Number(holding.shares_held ?? 0);
  const capital = Number(holding.total_invested_native);
  const fees = Number(holding.manual_total_fees ?? 0);
  const dividend = Number(holding.manual_total_dividend ?? 0);

  const effectiveShares = shares > 0 ? shares : 1;
  const pricePerShare =
    shares > 0
      ? Number(holding.average_cost ?? capital / shares)
      : capital;
  const totalAmount = shares > 0 ? shares * pricePerShare : capital;

  const transactions: StockEtfTransaction[] = [
    {
      id: crypto.randomUUID(),
      user_id: userId,
      holding_id: holding.id,
      transaction_type: "opening_balance",
      transaction_date: today,
      shares: effectiveShares,
      price_per_share: pricePerShare,
      total_amount: totalAmount,
      fees,
      notes: "Opening balance migrated from Manual Position mode",
      created_at: now,
      updated_at: now,
    },
  ];

  if (dividend > 0) {
    transactions.push({
      id: crypto.randomUUID(),
      user_id: userId,
      holding_id: holding.id,
      transaction_type: "dividend",
      transaction_date: today,
      shares: 0,
      price_per_share: 0,
      total_amount: dividend,
      fees: 0,
      notes: "Historical dividend migrated from Manual Position mode",
      created_at: now,
      updated_at: now,
    });
  }

  return transactions;
}
