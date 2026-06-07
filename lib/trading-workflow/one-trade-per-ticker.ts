import type { EnrichedTrade, TradeTrackerStatus } from "@/lib/trades/types";
import type { ActiveTickerExposureRow, ActiveTradeConflict } from "./types";

const ACTIVE_STATUSES: TradeTrackerStatus[] = ["open", "managed", "rolled"];

export function isActiveTradeStatus(status: string): boolean {
  return ACTIVE_STATUSES.includes(status as TradeTrackerStatus);
}

export function findActiveTradeForTicker(
  trades: EnrichedTrade[],
  ticker: string,
  excludeTradeId?: string
): EnrichedTrade | undefined {
  const key = ticker.toUpperCase();
  return trades.find(
    (t) =>
      t.ticker.toUpperCase() === key &&
      isActiveTradeStatus(t.status) &&
      t.id !== excludeTradeId
  );
}

export function toActiveTradeConflict(
  trade: EnrichedTrade
): ActiveTradeConflict {
  return {
    ticker: trade.ticker,
    strategy: trade.strategyLabel,
    expiryDate: trade.expirationDate,
    maxRisk: trade.calculations.maxRisk,
    currentPnl: trade.calculations.currentPnl,
    status: trade.statusLabel,
  };
}

export function buildActiveTickerExposure(
  trades: EnrichedTrade[],
  watchlistTickers: string[]
): ActiveTickerExposureRow[] {
  const open = trades.filter((t) => isActiveTradeStatus(t.status));
  const byTicker = new Map<string, EnrichedTrade>();
  for (const t of open) {
    if (!byTicker.has(t.ticker)) byTicker.set(t.ticker, t);
  }

  const tickers = new Set([
    ...watchlistTickers.map((t) => t.toUpperCase()),
    ...open.map((t) => t.ticker),
  ]);

  return [...tickers].sort().map((ticker) => {
    const trade = byTicker.get(ticker);
    if (!trade) {
      return {
        ticker,
        hasActiveTrade: false,
        strategy: null,
        expiry: null,
        maxRisk: null,
        currentPnl: null,
        status: null,
        tradeId: null,
      };
    }
    return {
      ticker,
      hasActiveTrade: true,
      strategy: trade.strategyLabel,
      expiry: trade.expirationDate,
      maxRisk: trade.calculations.maxRisk,
      currentPnl: trade.calculations.currentPnl,
      status: trade.statusLabel,
      tradeId: trade.id,
    };
  });
}
