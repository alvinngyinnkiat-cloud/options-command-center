import type { TradeOwnership } from "@/types/database";
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
  clientPnlOwed: number;
}

type TradeOwnershipInput = Pick<
  EnrichedTrade,
  | "status"
  | "tradeOwnership"
  | "isClientTrade"
  | "myProfitSharePercent"
  | "clientProfitSharePercent"
  | "calculations"
>;

export function isClientProfitSharingTrade(
  trade: Pick<EnrichedTrade, "tradeOwnership" | "isClientTrade">
): boolean {
  return (
    trade.tradeOwnership === "client_profit_sharing" || trade.isClientTrade
  );
}

/** Gross trade P/L — open uses current P/L, closed uses realized P/L. */
export function calculateTotalTradePnL(trade: TradeOwnershipInput): number {
  if (
    trade.status === "closed" &&
    trade.calculations.realizedPnl != null
  ) {
    return trade.calculations.realizedPnl;
  }
  return trade.calculations.currentPnl;
}

export function calculateMyPnL(
  trade: Pick<
    EnrichedTrade,
    "tradeOwnership" | "isClientTrade" | "myProfitSharePercent"
  >,
  totalTradePnL: number
): number {
  if (!isClientProfitSharingTrade(trade)) {
    return totalTradePnL;
  }
  return totalTradePnL * (trade.myProfitSharePercent / 100);
}

export function calculateClientPnL(
  trade: Pick<
    EnrichedTrade,
    | "tradeOwnership"
    | "isClientTrade"
    | "clientProfitSharePercent"
  >,
  totalTradePnL: number
): number {
  if (!isClientProfitSharingTrade(trade)) {
    return 0;
  }
  return totalTradePnL * (trade.clientProfitSharePercent / 100);
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
    .filter(isClientProfitSharingTrade)
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

  for (const trade of trades) {
    const total = calculateTotalTradePnL(trade);
    const my = calculateMyPnL(trade, total);
    const client = calculateClientPnL(trade, total);

    if (isOpenTrade(trade)) {
      myOpenPnl += my;
      clientOpenPnl += client;
    } else if (trade.status === "closed") {
      myRealizedPnl += my;
      clientRealizedPnl += client;
    }
  }

  return {
    myOpenPnl,
    myRealizedPnl,
    myTotalPnl: myOpenPnl + myRealizedPnl,
    clientOpenPnl,
    clientRealizedPnl,
    clientPnlOwed: calculateClientOutstanding(trades),
  };
}

export function calculateRiskShare(
  maxRisk: number,
  tradeOwnership: TradeOwnership,
  mySharePercent: number,
  clientSharePercent: number
): { myRisk: number; clientRisk: number } {
  if (tradeOwnership !== "client_profit_sharing") {
    return { myRisk: maxRisk, clientRisk: 0 };
  }
  return {
    myRisk: maxRisk * (mySharePercent / 100),
    clientRisk: maxRisk * (clientSharePercent / 100),
  };
}

/** P/L split from raw DB row fields (portfolio open positions). */
export function calculatePnLFromOptionsRow(row: {
  current_pnl: number | string;
  trade_ownership?: TradeOwnership | null;
  my_profit_share_percent?: number | string | null;
  client_profit_share_percent?: number | string | null;
}): TradePnlAllocation {
  const totalTradePnl = Number(row.current_pnl);
  const isClient = row.trade_ownership === "client_profit_sharing";
  if (!isClient) {
    return { totalTradePnl, myPnl: totalTradePnl, clientPnl: 0 };
  }
  const myPct = Number(row.my_profit_share_percent ?? 60);
  const clientPct = Number(row.client_profit_share_percent ?? 40);
  return {
    totalTradePnl,
    myPnl: totalTradePnl * (myPct / 100),
    clientPnl: totalTradePnl * (clientPct / 100),
  };
}
