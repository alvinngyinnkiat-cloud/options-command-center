import type { EnrichedTrade } from "@/lib/trades/types";
import { calculateMyPnL, calculateTotalTradePnL } from "@/lib/trades/pnl-allocation";
import type { LeapsPositionDetail } from "./types";

export function calculateAdjustedCostBasis(
  originalCost: number,
  premiumFromChildren: number
): number {
  return Math.max(0, originalCost - premiumFromChildren);
}

export function sumChildPremiumCollected(children: EnrichedTrade[]): number {
  return children.reduce(
    (sum, child) => sum + child.calculations.totalPremiumReceived,
    0
  );
}

export function buildLeapsPositionDetail(
  parent: EnrichedTrade,
  allTrades: EnrichedTrade[]
): LeapsPositionDetail {
  const originalCost =
    parent.originalCost ?? parent.calculations.buyingPowerUsed ?? 0;
  const childTrades = allTrades.filter(
    (t) => t.parentTradeId === parent.id && t.id !== parent.id
  );
  const premiumFromChildren = sumChildPremiumCollected(childTrades);
  const adjustedCostBasis = calculateAdjustedCostBasis(
    originalCost,
    premiumFromChildren
  );
  const totalPnl = calculateMyPnL(parent, calculateTotalTradePnL(parent));
  const childIncomePnl = childTrades.reduce(
    (sum, c) => sum + calculateMyPnL(c, calculateTotalTradePnL(c)),
    0
  );

  return {
    parentTrade: parent,
    childTrades,
    originalCost,
    premiumFromChildren,
    adjustedCostBasis,
    longPositionPnl: totalPnl,
    // Child premium is tracked separately in income; parent cost basis is reduced
  };
}

export function formatLeapsLabel(trade: EnrichedTrade): string {
  const strike = trade.strikes.longStrikeCall ?? trade.strikes.shortStrikeCall;
  const exp = trade.expirationDate;
  const monthYear = exp
    ? new Date(exp + "T12:00:00").toLocaleDateString("en-US", {
        month: "short",
        year: "numeric",
      })
    : "—";
  return strike != null
    ? `${trade.ticker} ${monthYear} ${strike}C`
    : `${trade.ticker} LEAPS`;
}
