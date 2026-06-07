import {
  calculateMyPnL,
  calculateTotalTradePnL,
  isClientProfitSharingTrade,
} from "@/lib/trades/pnl-allocation";
import type { EnrichedTrade } from "@/lib/trades/types";
import type { EnrichedStockEtfHolding } from "./types";
import {
  buildTickerPositionSummaries,
  getTickerSummaryBySymbol,
} from "@/lib/ticker-positions/aggregate";
import { mapEnrichedToDbRow } from "@/lib/stocks-etfs/build-tab-data";
import { isLongTermStrategy } from "@/lib/ticker-positions/categories";
import type { LeapsPositionDetail } from "@/lib/ticker-positions/types";
import type { UsEquityCategory } from "./market-category";
import { subYears, parseISO } from "date-fns";
import { MOCK_REFERENCE_DATE } from "@/lib/mock/reference-dates";
import type { TickerDividendTotals } from "@/lib/dividends/types";
import { resolveTickerDividendIncome } from "@/lib/dividends/calculations";
import { calculateIncomeYieldPct } from "@/lib/ticker-positions/income-yield";

export interface UsEquityPositionRow {
  ticker: string;
  category: UsEquityCategory;
  holding: EnrichedStockEtfHolding | null;
  shares: number;
  averageCost: number | null;
  currentPrice: number | null;
  marketValue: number;
  unrealizedPnl: number;
  unrealizedPnlPct: number;
  premiumCollected: number;
  realizedPremiumIncome: number;
  openPremiumIncome: number;
  originalCostBasis: number;
  adjustedCostBasis: number;
  netPositionPnl: number;
  totalReturnPct: number;
  totalPnl: number;
  associatedOptionsTrades: EnrichedTrade[];
  totalPremiumCollected: number;
  etfOrStockValue: number;
  leapsValue: number;
  currentAssetValue: number;
  leapsPositions: LeapsPositionDetail[];
  openTradesCount: number;
  closedTradesCount: number;
  roiPct: number;
  dividendIncome: number;
  annualDividendIncome: number;
  annualPremiumIncome: number;
  incomeYieldPct: number;
}

export interface UsEquityTabSummary {
  totalMarketValue: number;
  totalPnl: number;
  totalPremiumCollected: number;
  adjustedCostBasis: number;
  netPositionPnl: number;
  totalReturnPct: number;
}

function isOpenTrade(trade: EnrichedTrade): boolean {
  return (
    trade.status === "open" ||
    trade.status === "managed" ||
    trade.status === "closing"
  );
}

function getMyPremiumCollected(trade: EnrichedTrade): number {
  const gross = trade.calculations.totalPremiumReceived;
  if (!isClientProfitSharingTrade(trade)) return gross;
  return gross * (trade.myProfitSharePercent / 100);
}

function getLeapsCurrentValue(trades: EnrichedTrade[]): number {
  return trades
    .filter((t) => t.strategy === "leaps" && isOpenTrade(t))
    .reduce((s, t) => s + t.calculations.currentCloseCost, 0);
}

function getLeapsOriginalCost(trades: EnrichedTrade[]): number {
  return trades
    .filter((t) => t.strategy === "leaps")
    .reduce(
      (s, t) =>
        s +
        (t.originalCost ??
          t.calculations.buyingPowerUsed ??
          t.calculations.totalPremiumReceived),
      0
    );
}

function estimateAnnualPremiumIncome(trades: EnrichedTrade[]): number {
  const cutoff = subYears(parseISO(MOCK_REFERENCE_DATE), 1);
  return trades
    .filter((t) => !isLongTermStrategy(t.strategy))
    .filter((t) => parseISO(t.entryDate) >= cutoff)
    .reduce((s, t) => s + getMyPremiumCollected(t), 0);
}

export function buildUsEquityPositionRow(
  ticker: string,
  category: UsEquityCategory,
  holding: EnrichedStockEtfHolding | null,
  trades: EnrichedTrade[],
  dividendTotals?: Map<string, TickerDividendTotals>
): UsEquityPositionRow {
  const incomeTrades = trades.filter((t) => !isLongTermStrategy(t.strategy));
  const premiumCollected = incomeTrades.reduce(
    (s, t) => s + getMyPremiumCollected(t),
    0
  );
  const realizedPremiumIncome = incomeTrades
    .filter((t) => !isOpenTrade(t))
    .reduce(
      (s, t) => s + calculateMyPnL(t, calculateTotalTradePnL(t)),
      0
    );
  const openPremiumIncome = incomeTrades
    .filter((t) => isOpenTrade(t))
    .reduce(
      (s, t) => s + calculateMyPnL(t, calculateTotalTradePnL(t)),
      0
    );

  const shareCost = holding?.totalInvestedNative ?? 0;
  const shareValue = holding?.currentValueNative ?? 0;
  const leapsOriginal = getLeapsOriginalCost(trades);
  const dividendResolved = resolveTickerDividendIncome(
    ticker,
    dividendTotals ?? new Map()
  );
  const dividendIncome = dividendResolved.lifetimeNetDividends;
  const annualDividendIncome = dividendResolved.annualDividendIncome;
  const annualPremiumIncome = estimateAnnualPremiumIncome(trades);
  const originalCostBasis = shareCost + leapsOriginal;
  const adjustedCostBasis = Math.max(
    0,
    originalCostBasis - premiumCollected - dividendIncome
  );

  const leapsValue = getLeapsCurrentValue(trades);
  const etfOrStockValue = shareValue;
  const currentAssetValue = etfOrStockValue + leapsValue;

  const netPositionPnl = currentAssetValue - adjustedCostBasis;
  const totalReturnPct =
    adjustedCostBasis > 0 ? (netPositionPnl / adjustedCostBasis) * 100 : 0;

  const longUnrealized = shareValue - shareCost;
  const leapsUnrealized = trades
    .filter((t) => t.strategy === "leaps")
    .reduce(
      (s, t) => s + calculateMyPnL(t, calculateTotalTradePnL(t)),
      0
    );
  const unrealizedPnl = longUnrealized + leapsUnrealized;
  const unrealizedPnlPct =
    originalCostBasis > 0 ? (unrealizedPnl / originalCostBasis) * 100 : 0;

  const totalPnl =
    netPositionPnl + realizedPremiumIncome + openPremiumIncome + dividendIncome;

  const shares = holding?.sharesHeld ?? 0;
  const currentPrice =
    shares > 0 && shareValue > 0 ? shareValue / shares : null;

  const tickerSummaries = buildTickerPositionSummaries(
    trades,
    holding ? [mapEnrichedToDbRow(holding)] : []
  );
  const summary = getTickerSummaryBySymbol(tickerSummaries, ticker);

  return {
    ticker,
    category,
    holding,
    shares,
    averageCost: holding?.averageCost ?? null,
    currentPrice,
    marketValue: shareValue,
    unrealizedPnl,
    unrealizedPnlPct,
    premiumCollected,
    realizedPremiumIncome,
    openPremiumIncome,
    originalCostBasis,
    adjustedCostBasis,
    netPositionPnl,
    totalReturnPct,
    totalPnl,
    associatedOptionsTrades: trades,
    totalPremiumCollected: premiumCollected,
    etfOrStockValue: shareValue,
    leapsValue,
    currentAssetValue,
    leapsPositions: summary?.leapsPositions ?? [],
    openTradesCount: summary?.openTradesCount ?? trades.filter(isOpenTrade).length,
    closedTradesCount:
      summary?.closedTradesCount ?? trades.filter((t) => !isOpenTrade(t)).length,
    roiPct: summary?.roiPct ?? totalReturnPct,
    dividendIncome,
    annualDividendIncome,
    annualPremiumIncome,
    incomeYieldPct: calculateIncomeYieldPct(
      annualPremiumIncome + annualDividendIncome,
      originalCostBasis
    ),
  };
}

export function buildUsEquityTabData(
  category: UsEquityCategory,
  holdings: EnrichedStockEtfHolding[],
  allTrades: EnrichedTrade[],
  dividendTotals?: Map<string, TickerDividendTotals>
): { rows: UsEquityPositionRow[]; summary: UsEquityTabSummary } {
  const categoryHoldings = holdings.filter((h) => {
    const isEtf = h.assetType === "etf" && h.currency === "USD";
    const isStock = h.assetType === "stock" && h.currency === "USD";
    return category === "us_etf" ? isEtf : isStock;
  });

  const tickerSet = new Set<string>();
  for (const h of categoryHoldings) tickerSet.add(h.ticker.toUpperCase());
  for (const t of allTrades) {
    if (t.ticker) tickerSet.add(t.ticker.toUpperCase());
  }

  const rows: UsEquityPositionRow[] = [...tickerSet]
    .map((ticker) => {
      const holding =
        categoryHoldings.find((h) => h.ticker.toUpperCase() === ticker) ??
        null;
      const trades = allTrades.filter(
        (t) => t.ticker.toUpperCase() === ticker
      );
      if (!holding && trades.length === 0) return null;
      return buildUsEquityPositionRow(
        ticker,
        category,
        holding,
        trades,
        dividendTotals
      );
    })
    .filter((r): r is UsEquityPositionRow => r != null)
    .sort((a, b) => b.totalPnl - a.totalPnl);

  const summary: UsEquityTabSummary = {
    totalMarketValue: rows.reduce((s, r) => s + r.currentAssetValue, 0),
    totalPnl: rows.reduce((s, r) => s + r.totalPnl, 0),
    totalPremiumCollected: rows.reduce(
      (s, r) => s + r.totalPremiumCollected,
      0
    ),
    adjustedCostBasis: rows.reduce((s, r) => s + r.adjustedCostBasis, 0),
    netPositionPnl: rows.reduce((s, r) => s + r.netPositionPnl, 0),
    totalReturnPct: 0,
  };
  summary.totalReturnPct =
    summary.adjustedCostBasis > 0
      ? (summary.netPositionPnl / summary.adjustedCostBasis) * 100
      : 0;

  return { rows, summary };
}

export function sumPremiumByCategory(
  rows: UsEquityPositionRow[]
): number {
  return rows.reduce((s, r) => s + r.totalPremiumCollected, 0);
}

export function sumLeapsPremium(trades: EnrichedTrade[]): number {
  return trades
    .filter((t) => t.parentTradeId != null && !isLongTermStrategy(t.strategy))
    .reduce((s, t) => s + getMyPremiumCollected(t), 0);
}
