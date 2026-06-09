import { calculateRealizedPnl, calculateTotalPremiumReceived } from "./calculations";
import { calculateExitDebitTotal } from "./exit-debit";

export interface ClosedTradePnlInput {
  premiumPerContract: number;
  contracts: number;
  exitDebitTotal: number | null;
  feesCommission?: number;
  brokerRealizedPnl?: number | null;
}

export interface ClosedTradePnlBreakdown {
  premiumReceived: number;
  exitDebitTotal: number | null;
  feesCommission: number;
  calculatedRealizedPnl: number | null;
  finalRealizedPnl: number | null;
}

/** Closed credit strategy: premium − exit debit − fees. */
export function calculateCalculatedRealizedPnl(input: {
  totalPremiumReceived: number;
  exitDebitTotal: number | null;
  feesCommission?: number;
}): number | null {
  if (input.exitDebitTotal == null) return null;
  return calculateRealizedPnl(
    input.totalPremiumReceived,
    input.exitDebitTotal,
    input.feesCommission ?? 0
  );
}

/** Debit-long close: exit proceeds − cost − fees. */
export function calculateDebitLongRealizedPnl(input: {
  exitDebitTotal: number;
  debitCost: number;
  feesCommission?: number;
}): number {
  return (
    input.exitDebitTotal - input.debitCost - (input.feesCommission ?? 0)
  );
}

export function resolveFinalRealizedPnl(input: {
  calculatedRealizedPnl: number | null;
  brokerRealizedPnl?: number | null;
}): number | null {
  if (input.brokerRealizedPnl != null) return input.brokerRealizedPnl;
  return input.calculatedRealizedPnl;
}

export function buildClosedTradePnlBreakdown(
  input: ClosedTradePnlInput
): ClosedTradePnlBreakdown {
  const premiumReceived = calculateTotalPremiumReceived(
    input.premiumPerContract,
    input.contracts
  );
  const feesCommission = Math.max(0, input.feesCommission ?? 0);
  const calculatedRealizedPnl = calculateCalculatedRealizedPnl({
    totalPremiumReceived: premiumReceived,
    exitDebitTotal: input.exitDebitTotal,
    feesCommission,
  });
  const finalRealizedPnl = resolveFinalRealizedPnl({
    calculatedRealizedPnl,
    brokerRealizedPnl: input.brokerRealizedPnl,
  });

  return {
    premiumReceived,
    exitDebitTotal: input.exitDebitTotal,
    feesCommission,
    calculatedRealizedPnl,
    finalRealizedPnl,
  };
}

export function buildCloseTradePreviewWithFees(input: {
  premiumPerContract: number;
  contracts: number;
  exitDebitPerContract: number;
  feesCommission?: number;
}): {
  premiumReceived: number;
  exitDebitPerContract: number;
  exitDebitTotal: number;
  feesCommission: number;
  calculatedRealizedPnl: number;
  estimatedRealizedPnl: number;
} {
  const premiumReceived = calculateTotalPremiumReceived(
    input.premiumPerContract,
    input.contracts
  );
  const exitDebitTotal = calculateExitDebitTotal(
    input.exitDebitPerContract,
    input.contracts
  );
  const feesCommission = Math.max(0, input.feesCommission ?? 0);
  const calculatedRealizedPnl = calculateRealizedPnl(
    premiumReceived,
    exitDebitTotal,
    feesCommission
  );

  return {
    premiumReceived,
    exitDebitPerContract: input.exitDebitPerContract,
    exitDebitTotal,
    feesCommission,
    calculatedRealizedPnl,
    estimatedRealizedPnl: calculatedRealizedPnl,
  };
}
