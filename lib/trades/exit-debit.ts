/**
 * Exit / closing debit semantics for options_trades.exit_debit
 *
 * Storage format (B): exit_debit = TOTAL closing cost in USD
 *   = close_price_per_contract × 100 × contracts
 *
 * UI input format (A): per-contract closing debit (same scale as premium per contract)
 *
 * There is no separate close_price / exit_price column — only exit_debit.
 */

import { calculateRealizedPnl, calculateTotalPremiumReceived } from "./calculations";

/** Total closing cost from per-contract debit quote. */
export function calculateExitDebitTotal(
  exitDebitPerContract: number,
  contracts: number
): number {
  if (!Number.isFinite(exitDebitPerContract) || exitDebitPerContract < 0) return 0;
  if (contracts <= 0) return 0;
  return Math.round(exitDebitPerContract * 100 * contracts * 100) / 100;
}

/** Per-contract closing debit from stored total. */
export function deriveExitDebitPerContract(
  exitDebitTotal: number | null | undefined,
  contracts: number
): number | null {
  if (exitDebitTotal == null || !Number.isFinite(exitDebitTotal)) return null;
  if (contracts <= 0) return exitDebitTotal;
  return Math.round((exitDebitTotal / (100 * contracts)) * 10000) / 10000;
}

/**
 * Normalize exit_debit read from the database.
 * Legacy rows may store per-contract debit in exit_debit instead of total.
 */
export function resolveStoredExitDebitTotal(
  storedExitDebit: number | null | undefined,
  premiumPerContract: number,
  contracts: number
): number | null {
  if (storedExitDebit == null) return null;
  if (storedExitDebit === 0) return 0;

  const asPerContractTotal = calculateExitDebitTotal(storedExitDebit, contracts);

  if (
    storedExitDebit > 0 &&
    storedExitDebit <= premiumPerContract * 1.001 &&
    asPerContractTotal > storedExitDebit
  ) {
    return asPerContractTotal;
  }

  return storedExitDebit;
}

export interface CloseTradePreview {
  premiumReceived: number;
  exitDebitPerContract: number;
  exitDebitTotal: number;
  estimatedRealizedPnl: number;
}

export function buildCloseTradePreview(input: {
  premiumPerContract: number;
  contracts: number;
  exitDebitPerContract: number;
  feesCommission?: number;
}): CloseTradePreview {
  const premiumReceived = calculateTotalPremiumReceived(
    input.premiumPerContract,
    input.contracts
  );
  const exitDebitTotal = calculateExitDebitTotal(
    input.exitDebitPerContract,
    input.contracts
  );
  const estimatedRealizedPnl = calculateRealizedPnl(
    premiumReceived,
    exitDebitTotal,
    input.feesCommission ?? 0
  );

  return {
    premiumReceived,
    exitDebitPerContract: input.exitDebitPerContract,
    exitDebitTotal,
    estimatedRealizedPnl,
  };
}
