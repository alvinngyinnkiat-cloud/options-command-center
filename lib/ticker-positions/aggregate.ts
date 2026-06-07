import {
  calculateMyPnL,
  calculateTotalTradePnL,
} from "@/lib/trades/pnl-allocation";
import type { EnrichedTrade } from "@/lib/trades/types";
import type { StockEtfHolding } from "@/types/database";
import {
  getDisplayStrategyLabel,
  getPositionCategory,
  isDebitLongStrategy,
  isLongTermStrategy,
} from "./categories";
import { buildLeapsPositionDetail } from "./leaps";
import type {
  TickerPerformanceReport,
  TickerPositionSummary,
  TickerSharePosition,
  TickerTradeRow,
} from "./types";

function isOpenTrade(trade: EnrichedTrade): boolean {
  return (
    trade.status === "open" ||
    trade.status === "managed" ||
    trade.status === "closing"
  );
}

function getMyPnl(trade: EnrichedTrade): number {
  return calculateMyPnL(trade, calculateTotalTradePnL(trade));
}

function getCapitalDeployed(trade: EnrichedTrade): number {
  if (isDebitLongStrategy(trade.strategy)) {
    return (
      trade.originalCost ??
      trade.calculations.buyingPowerUsed ??
      trade.calculations.totalPremiumReceived
    );
  }
  return trade.calculations.buyingPowerUsed || trade.calculations.maxRisk;
}

function getPremiumCollected(trade: EnrichedTrade): number {
  if (isLongTermStrategy(trade.strategy)) return 0;
  return trade.calculations.totalPremiumReceived;
}

function toTradeRow(trade: EnrichedTrade): TickerTradeRow {
  const myPnl = getMyPnl(trade);
  const open = isOpenTrade(trade);
  return {
    trade,
    displayStrategy: getDisplayStrategyLabel(trade),
    category: getPositionCategory(trade.strategy, trade.sellCallCoverage),
    myPnl,
    myRealizedPnl: open ? 0 : myPnl,
    myUnrealizedPnl: open ? myPnl : 0,
    premiumCollected: getPremiumCollected(trade),
    capitalDeployed: getCapitalDeployed(trade),
    currentValue: trade.calculations.currentCloseCost,
    isOpen: open,
    parentTradeId: trade.parentTradeId,
  };
}

function sharePositionFromHolding(row: StockEtfHolding): TickerSharePosition {
  const cost = Number(row.total_invested_native);
  const current = Number(row.current_value_native);
  return {
    ticker: row.ticker.toUpperCase(),
    sharesHeld: Number(row.shares_held ?? 0),
    costBasis: cost,
    currentValue: current,
    unrealizedPnl: current - cost,
  };
}

function buildTickerSummary(
  ticker: string,
  trades: EnrichedTrade[],
  sharePosition: TickerSharePosition | null
): TickerPositionSummary {
  const rows = trades.map(toTradeRow);
  const longTermTrades = rows.filter((r) => r.category === "long_term");
  const incomeTrades = rows.filter((r) => r.category === "income");

  const leapsParents = trades.filter((t) => t.strategy === "leaps");
  const leapsPositions = leapsParents.map((p) =>
    buildLeapsPositionDetail(p, trades)
  );

  const longTermStrategies = [
    ...new Set(longTermTrades.map((r) => r.displayStrategy)),
    ...(sharePosition && sharePosition.sharesHeld > 0 ? ["Shares"] : []),
  ];
  const incomeStrategies = [...new Set(incomeTrades.map((r) => r.displayStrategy))];

  const tradeCapital = rows.reduce((s, r) => s + r.capitalDeployed, 0);
  const shareCapital = sharePosition?.costBasis ?? 0;
  const totalCapitalDeployed = tradeCapital + shareCapital;

  const tradeCurrentValue = rows
    .filter((r) => r.isOpen)
    .reduce((s, r) => s + r.currentValue, 0);
  const shareCurrent = sharePosition?.currentValue ?? 0;
  const currentPositionValue = tradeCurrentValue + shareCurrent;

  const totalPremiumCollected = incomeTrades.reduce(
    (s, r) => s + r.premiumCollected,
    0
  );

  const realizedPnl = rows.reduce((s, r) => s + r.myRealizedPnl, 0);
  const unrealizedPnl =
    rows.reduce((s, r) => s + r.myUnrealizedPnl, 0) +
    (sharePosition?.unrealizedPnl ?? 0);

  const longPositionPnl =
    longTermTrades.reduce((s, r) => s + r.myPnl, 0) +
    (sharePosition?.unrealizedPnl ?? 0);
  const incomeTradePnl = incomeTrades.reduce((s, r) => s + r.myPnl, 0);
  const totalPnl = longPositionPnl + incomeTradePnl;

  const incomeCollected = totalPremiumCollected;
  const adjustedCostBasis =
    leapsPositions.length === 1
      ? leapsPositions[0].adjustedCostBasis
      : leapsPositions.length > 1
        ? leapsPositions.reduce((s, l) => s + l.adjustedCostBasis, 0)
        : null;

  const roiPct =
    totalCapitalDeployed > 0 ? (totalPnl / totalCapitalDeployed) * 100 : 0;

  return {
    ticker,
    longTermStrategies,
    incomeStrategies,
    longTermTrades,
    incomeTrades,
    sharePosition,
    leapsPositions,
    totalCapitalDeployed,
    currentPositionValue,
    totalPremiumCollected,
    realizedPnl,
    unrealizedPnl,
    totalPnl,
    longPositionPnl,
    incomeTradePnl,
    incomeCollected,
    adjustedCostBasis,
    roiPct,
    openTradesCount: rows.filter((r) => r.isOpen).length,
    closedTradesCount: rows.filter((r) => !r.isOpen).length,
  };
}

export function buildTickerPositionSummaries(
  trades: EnrichedTrade[],
  stockHoldings: StockEtfHolding[] = []
): TickerPositionSummary[] {
  const sharesByTicker = new Map<string, TickerSharePosition>();
  for (const row of stockHoldings) {
    const ticker = row.ticker.toUpperCase();
    const existing = sharesByTicker.get(ticker);
    const next = sharePositionFromHolding(row);
    if (existing) {
      sharesByTicker.set(ticker, {
        ticker,
        sharesHeld: existing.sharesHeld + next.sharesHeld,
        costBasis: existing.costBasis + next.costBasis,
        currentValue: existing.currentValue + next.currentValue,
        unrealizedPnl: existing.unrealizedPnl + next.unrealizedPnl,
      });
    } else {
      sharesByTicker.set(ticker, next);
    }
  }

  const tickerSet = new Set<string>();
  for (const t of trades) tickerSet.add(t.ticker.toUpperCase());
  for (const ticker of sharesByTicker.keys()) tickerSet.add(ticker);

  const byTicker = new Map<string, EnrichedTrade[]>();
  for (const trade of trades) {
    const key = trade.ticker.toUpperCase();
    const list = byTicker.get(key) ?? [];
    list.push(trade);
    byTicker.set(key, list);
  }

  return [...tickerSet]
    .sort()
    .map((ticker) =>
      buildTickerSummary(
        ticker,
        byTicker.get(ticker) ?? [],
        sharesByTicker.get(ticker) ?? null
      )
    )
    .filter(
      (s) =>
        s.longTermTrades.length > 0 ||
        s.incomeTrades.length > 0 ||
        s.sharePosition != null
    )
    .sort((a, b) => b.totalPnl - a.totalPnl);
}

export function buildTickerPerformanceReport(
  summaries: TickerPositionSummary[]
): TickerPerformanceReport {
  const withActivity = summaries.filter(
    (s) => s.totalPnl !== 0 || s.totalPremiumCollected > 0
  );
  const sorted = [...withActivity].sort((a, b) => b.totalPnl - a.totalPnl);

  return {
    topPerformers: sorted.slice(0, 5),
    worstPerformers: [...sorted].reverse().slice(0, 5),
    incomeByTicker: sorted.map((s) => ({
      ticker: s.ticker,
      incomePnl: s.incomeTradePnl,
      premiumCollected: s.totalPremiumCollected,
    })),
    premiumByTicker: [...sorted]
      .sort((a, b) => b.totalPremiumCollected - a.totalPremiumCollected)
      .map((s) => ({
        ticker: s.ticker,
        premiumCollected: s.totalPremiumCollected,
      })),
    summaries: sorted,
  };
}

export function getTickerSummaryBySymbol(
  summaries: TickerPositionSummary[],
  ticker: string
): TickerPositionSummary | null {
  return (
    summaries.find((s) => s.ticker.toUpperCase() === ticker.toUpperCase()) ??
    null
  );
}
