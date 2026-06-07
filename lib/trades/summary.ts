import type { EnrichedTrade, TradeTrackerSummary } from "./types";
import {
  buildPortfolioPnlBreakdown,
  calculateClientPnL,
  calculateMyPnL,
  calculateRiskShare,
  calculateTotalTradePnL,
} from "./pnl-allocation";

function isOpenTrade(trade: EnrichedTrade): boolean {
  return (
    trade.status === "open" ||
    trade.status === "managed" ||
    trade.status === "closing"
  );
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
  const myOpenRisk = open.reduce((s, t) => {
    const share = calculateRiskShare(
      t.calculations.maxRisk,
      t.tradeOwnership,
      t.myProfitSharePercent,
      t.clientProfitSharePercent
    );
    return s + share.myRisk;
  }, 0);
  const clientOpenRisk = open.reduce((s, t) => {
    const share = calculateRiskShare(
      t.calculations.maxRisk,
      t.tradeOwnership,
      t.myProfitSharePercent,
      t.clientProfitSharePercent
    );
    return s + share.clientRisk;
  }, 0);

  const totalPremiumCollected = trades.reduce(
    (s, t) => s + t.calculations.totalPremiumReceived,
    0
  );

  const currentPnl = open.reduce(
    (s, t) => s + t.calculations.currentPnl,
    0
  );
  const realizedPnl = closed.reduce(
    (s, t) => s + (t.calculations.realizedPnl ?? t.calculations.currentPnl),
    0
  );

  const pnlBreakdown = buildPortfolioPnlBreakdown(trades);

  const closedWins = closed.filter((t) => {
    const total = calculateTotalTradePnL(t);
    return calculateMyPnL(t, total) > 0;
  }).length;
  const winRate =
    closed.length > 0 ? (closedWins / closed.length) * 100 : 0;

  return {
    openTrades: open.length,
    closedTrades: closed.length,
    totalOpenRisk,
    myOpenRisk,
    clientOpenRisk,
    totalPremiumCollected,
    currentPnl,
    realizedPnl,
    myCurrentPnl: pnlBreakdown.myOpenPnl,
    myRealizedPnl: pnlBreakdown.myRealizedPnl,
    clientUnrealizedPnl: pnlBreakdown.clientOpenPnl,
    clientRealizedPnl: pnlBreakdown.clientRealizedPnl,
    clientPnlOwed: pnlBreakdown.clientPnlOwed,
    winRate,
  };
}

/** Sum client P/L on closed client trades (for reports). */
export function sumClientClosedPnl(trades: EnrichedTrade[]): number {
  return trades
    .filter((t) => t.status === "closed")
    .reduce(
      (s, t) => s + calculateClientPnL(t, calculateTotalTradePnL(t)),
      0
    );
}
