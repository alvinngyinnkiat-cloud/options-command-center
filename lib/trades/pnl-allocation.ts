import type { TradeOwnership } from "@/types/database";
import {
  SHARED_CLIENT_SHARE_PCT,
  SHARED_MY_SHARE_PCT,
} from "./constants";
import type { EnrichedTrade } from "./types";

export interface TradePnlAllocation {
  totalTradePnl: number;
  myPnl: number;
  clientPnl: number;
}

export interface PortfolioPnlBreakdown {
  myOpenPnl: number;
  myRealizedPnl: number;
  myTotalPnl: number;
  clientOpenPnl: number;
  clientRealizedPnl: number;
  clientTotalPnl: number;
  totalRealizedPnl: number;
  totalUnrealizedPnl: number;
  totalPnl: number;
  /** @deprecated Open client unrealized P/L — use clientOpenPnl */
  clientPnlOwed: number;
}

type TradeOwnershipInput = Pick<
  EnrichedTrade,
  | "status"
  | "tradeOwnership"
  | "isClientTrade"
  | "calculations"
>;

export function isSharedTrade(
  trade: Pick<EnrichedTrade, "tradeOwnership" | "isClientTrade">
): boolean {
  return (
    trade.tradeOwnership === "client_profit_sharing" || trade.isClientTrade
  );
}

/** @deprecated Use isSharedTrade */
export function isClientProfitSharingTrade(
  trade: Pick<EnrichedTrade, "tradeOwnership" | "isClientTrade">
): boolean {
  return isSharedTrade(trade);
}

/** Gross trade P/L — open uses unrealized, closed uses realized. */
export function calculateTotalTradePnL(trade: TradeOwnershipInput): number {
  if (trade.status === "closed") {
    if (trade.calculations.realizedPnl != null) {
      return trade.calculations.realizedPnl;
    }
    return 0;
  }
  return trade.calculations.currentPnl;
}

export function calculateMyPnL(
  trade: Pick<EnrichedTrade, "tradeOwnership" | "isClientTrade">,
  totalTradePnL: number
): number {
  if (!isSharedTrade(trade)) {
    return totalTradePnL;
  }
  return totalTradePnL * (SHARED_MY_SHARE_PCT / 100);
}

export function calculateClientPnL(
  trade: Pick<EnrichedTrade, "tradeOwnership" | "isClientTrade">,
  totalTradePnL: number
): number {
  if (!isSharedTrade(trade)) {
    return 0;
  }
  return totalTradePnL * (SHARED_CLIENT_SHARE_PCT / 100);
}

export function calculateTradePnlAllocation(
  trade: EnrichedTrade
): TradePnlAllocation {
  const totalTradePnl = calculateTotalTradePnL(trade);
  return {
    totalTradePnl,
    myPnl: calculateMyPnL(trade, totalTradePnl),
    clientPnl: calculateClientPnL(trade, totalTradePnl),
  };
}

function isOpenTrade(trade: EnrichedTrade): boolean {
  return (
    trade.status === "open" ||
    trade.status === "managed" ||
    trade.status === "closing"
  );
}

/** Sum of my P/L across all trades (open + closed). */
export function calculatePortfolioPersonalPnL(
  trades: EnrichedTrade[]
): number {
  return trades.reduce(
    (sum, trade) => sum + calculateMyPnL(trade, calculateTotalTradePnL(trade)),
    0
  );
}

/** Client share still at risk on open client trades (unrealized client P/L). */
export function calculateClientOutstanding(
  trades: EnrichedTrade[]
): number {
  return trades
    .filter(isOpenTrade)
    .filter(isSharedTrade)
    .reduce(
      (sum, trade) =>
        sum + calculateClientPnL(trade, calculateTotalTradePnL(trade)),
      0
    );
}

export function buildPortfolioPnlBreakdown(
  trades: EnrichedTrade[]
): PortfolioPnlBreakdown {
  let myOpenPnl = 0;
  let myRealizedPnl = 0;
  let clientOpenPnl = 0;
  let clientRealizedPnl = 0;
  let totalRealizedPnl = 0;
  let totalUnrealizedPnl = 0;

  for (const trade of trades) {
    const total = calculateTotalTradePnL(trade);
    const my = calculateMyPnL(trade, total);
    const client = calculateClientPnL(trade, total);

    if (isOpenTrade(trade)) {
      myOpenPnl += my;
      clientOpenPnl += client;
      totalUnrealizedPnl += total;
    } else if (trade.status === "closed") {
      myRealizedPnl += my;
      clientRealizedPnl += client;
      totalRealizedPnl += total;
    }
  }

  const totalPnl = totalRealizedPnl + totalUnrealizedPnl;
  const clientTotalPnl = clientRealizedPnl + clientOpenPnl;

  return {
    myOpenPnl,
    myRealizedPnl,
    myTotalPnl: myOpenPnl + myRealizedPnl,
    clientOpenPnl,
    clientRealizedPnl,
    clientTotalPnl,
    totalRealizedPnl,
    totalUnrealizedPnl,
    totalPnl,
    clientPnlOwed: clientOpenPnl,
  };
}

export function calculateRiskShare(
  maxRisk: number,
  tradeOwnership: TradeOwnership,
  _mySharePercent?: number,
  _clientSharePercent?: number
): { myRisk: number; clientRisk: number } {
  if (tradeOwnership !== "client_profit_sharing") {
    return { myRisk: maxRisk, clientRisk: 0 };
  }
  return {
    myRisk: maxRisk * (SHARED_MY_SHARE_PCT / 100),
    clientRisk: maxRisk * (SHARED_CLIENT_SHARE_PCT / 100),
  };
}

/** P/L split from raw DB row fields (portfolio open positions). */
export function calculatePnLFromOptionsRow(row: {
  current_pnl: number | string;
  trade_ownership?: TradeOwnership | null;
}): TradePnlAllocation {
  const totalTradePnl = Number(row.current_pnl);
  const isClient = row.trade_ownership === "client_profit_sharing";
  if (!isClient) {
    return { totalTradePnl, myPnl: totalTradePnl, clientPnl: 0 };
  }
  return {
    totalTradePnl,
    myPnl: totalTradePnl * (SHARED_MY_SHARE_PCT / 100),
    clientPnl: totalTradePnl * (SHARED_CLIENT_SHARE_PCT / 100),
  };
}
