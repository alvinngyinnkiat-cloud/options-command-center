import type { EnrichedTrade } from "./types";
import { calculateTotalPremiumReceived } from "./calculations";
import { isDebitLongStrategy } from "./strategy-meta";

/**
 * Premium collected for one trade — total credit received at entry.
 * Counts income/credit strategies only (not debit LEAPS purchases).
 * Status does not matter: open, managed, closing, closed, and rolled all count.
 */
export function getTradePremiumCollected(trade: EnrichedTrade): number {
  if (isDebitLongStrategy(trade.strategy)) return 0;

  const fromCalculations = trade.calculations.totalPremiumReceived;
  if (fromCalculations > 0) return fromCalculations;

  return calculateTotalPremiumReceived(
    trade.premiumPerContract,
    trade.contracts
  );
}

/**
 * Premium Collected = total credits received from all trades (open + closed + rolled).
 */
export function calculateTotalPremiumCollected(
  trades: EnrichedTrade[]
): number {
  return trades.reduce((sum, trade) => sum + getTradePremiumCollected(trade), 0);
}
