import type { ClientProfitSharingSummary } from "@/lib/client-profit-sharing/types";

export interface ClientCapitalMetrics {
  clientInitialCapital: number;
  clientCurrentValue: number;
  clientPnl: number;
  clientReturnPct: number;
}

/** Client NAV = initial capital + lifetime client share of trade P/L. */
export function buildClientCapitalMetrics(
  summary: ClientProfitSharingSummary
): ClientCapitalMetrics {
  const clientInitialCapital = summary.totalClientCapital;
  const clientPnl = summary.totalClientNetPl;
  const clientCurrentValue = clientInitialCapital + clientPnl;
  const clientReturnPct =
    clientInitialCapital > 0 ? (clientPnl / clientInitialCapital) * 100 : 0;

  return {
    clientInitialCapital,
    clientCurrentValue,
    clientPnl,
    clientReturnPct,
  };
}

export function calculateTotalAssetsManaged(
  myPortfolioValue: number,
  clientCurrentValue: number
): number {
  return myPortfolioValue + clientCurrentValue;
}
