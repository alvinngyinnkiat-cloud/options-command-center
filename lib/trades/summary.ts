import type { EnrichedTrade, TradeTrackerSummary } from "./types";
import {
  buildPortfolioPnlBreakdown,
  calculateClientPnL,
  calculateRiskShare,
  calculateTotalTradePnL,
} from "./pnl-allocation";
import { calculateTotalPremiumCollected } from "./premium-collected";

function isOpenTrade(trade: EnrichedTrade): boolean {
  return (
    trade.status === "open" ||
    trade.status === "managed" ||
    trade.status === "closing"
  );
}

function closedRealizedPnl(trade: EnrichedTrade): number {
  return calculateTotalTradePnL(trade);
}

export function buildTradeTrackerSummary(
  trades: EnrichedTrade[]
): TradeTrackerSummary {
  const open = trades.filter(isOpenTrade);
  const closed = trades.filter((t) => t.status === "closed");

  const totalOpenRisk = open.reduce(
    (s, t) => s + t.calculations.maxRisk,
    0
  );

  const pnlBreakdown = buildPortfolioPnlBreakdown(trades);

  const closedPnls = closed.map(closedRealizedPnl);
  const winners = closedPnls.filter((p) => p > 0);
  const losers = closedPnls.filter((p) => p < 0);

  const profitTradesCount = winners.length;
  const losingTradesCount = losers.length;
  const averageProfit =
    profitTradesCount > 0
      ? winners.reduce((s, p) => s + p, 0) / profitTradesCount
      : 0;
  const averageLoss =
    losingTradesCount > 0
      ? losers.reduce((s, p) => s + p, 0) / losingTradesCount
      : 0;

  const winRate =
    closed.length > 0 ? (profitTradesCount / closed.length) * 100 : 0;

  return {
    totalPnl: pnlBreakdown.totalPnl,
    totalRealizedPnl: pnlBreakdown.totalRealizedPnl,
    totalUnrealizedPnl: pnlBreakdown.totalUnrealizedPnl,
    clientPnl: pnlBreakdown.clientTotalPnl,
    clientRealizedPnl: pnlBreakdown.clientRealizedPnl,
    clientUnrealizedPnl: pnlBreakdown.clientOpenPnl,
    myPnl: pnlBreakdown.myTotalPnl,
    myRealizedPnl: pnlBreakdown.myRealizedPnl,
    myUnrealizedPnl: pnlBreakdown.myOpenPnl,
    totalTrades: open.length + closed.length,
    openTrades: open.length,
    closedTrades: closed.length,
    totalOpenRisk,
    totalPremiumCollected: calculateTotalPremiumCollected(trades),
    profitTradesCount,
    averageProfit,
    losingTradesCount,
    averageLoss,
    winRate,
    /** @deprecated */
    currentPnl: pnlBreakdown.totalUnrealizedPnl,
    /** @deprecated */
    realizedPnl: pnlBreakdown.totalRealizedPnl,
    /** @deprecated */
    myCurrentPnl: pnlBreakdown.myOpenPnl,
    /** @deprecated */
    clientPnlOwed: pnlBreakdown.clientOpenPnl,
    /** @deprecated */
    myOpenRisk: open.reduce((s, t) => {
      const share = calculateRiskShare(
        t.calculations.maxRisk,
        t.tradeOwnership
      );
      return s + share.myRisk;
    }, 0),
    /** @deprecated */
    clientOpenRisk: open.reduce((s, t) => {
      const share = calculateRiskShare(
        t.calculations.maxRisk,
        t.tradeOwnership
      );
      return s + share.clientRisk;
    }, 0),
  };
}

export function sumClientClosedPnl(trades: EnrichedTrade[]): number {
  return trades
    .filter((t) => t.status === "closed")
    .reduce(
      (s, t) => s + calculateClientPnL(t, calculateTotalTradePnL(t)),
      0
    );
}
