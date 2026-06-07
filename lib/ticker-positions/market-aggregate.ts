import { subYears, parseISO } from "date-fns";
import {
  calculateMyPnL,
  calculateTotalTradePnL,
  isClientProfitSharingTrade,
} from "@/lib/trades/pnl-allocation";
import type { EnrichedTrade } from "@/lib/trades/types";
import {
  categoryLabel,
  classifyHoldingCategory,
  US_ETF_TAB,
  US_STOCK_TAB,
} from "@/lib/stocks-etfs/market-category";
import type { EnrichedStockEtfHolding } from "@/lib/stocks-etfs/types";
import { buildUsEquityPositionRow } from "@/lib/stocks-etfs/us-equity-positions";
import { MOCK_REFERENCE_DATE } from "@/lib/mock/reference-dates";
import { isLongTermStrategy } from "./categories";
import {
  calculateAdjustedCostBasisSg,
  calculateAdjustedCostBasisUs,
  calculateIncomeYieldPct,
  calculateNetPositionPnl,
  calculateRoiPct,
} from "./income-yield";
import type {
  DividendGeneratorRow,
  MarketPerformanceReport,
  PassiveIncomeGeneratorRow,
  PortfolioIncomeSummary,
  PremiumGeneratorRow,
  SgMarketSummary,
  SgMarketTickerRow,
  UsMarketSummary,
  UsMarketTickerRow,
} from "./market-types";
import type { TickerDividendTotals } from "@/lib/dividends/types";
import { resolveTickerDividendIncome } from "@/lib/dividends/calculations";

function isOpenTrade(trade: EnrichedTrade): boolean {
  return (
    trade.status === "open" ||
    trade.status === "managed" ||
    trade.status === "closing"
  );
}

export function getMyPremiumCollected(trade: EnrichedTrade): number {
  const gross = trade.calculations.totalPremiumReceived;
  if (!isClientProfitSharingTrade(trade)) return gross;
  return gross * (trade.myProfitSharePercent / 100);
}

function estimateAnnualPremiumIncome(
  trades: EnrichedTrade[],
  asOfDate: string = MOCK_REFERENCE_DATE
): number {
  const cutoff = subYears(parseISO(asOfDate), 1);
  return trades
    .filter((t) => !isLongTermStrategy(t.strategy))
    .filter((t) => parseISO(t.entryDate) >= cutoff)
    .reduce((s, t) => s + getMyPremiumCollected(t), 0);
}

function resolveUsCategory(
  holding: EnrichedStockEtfHolding | null,
  trades: EnrichedTrade[]
): { label: string; key: UsMarketTickerRow["marketCategory"] } {
  if (holding) {
    const cat = classifyHoldingCategory(holding);
    return { label: categoryLabel(cat), key: cat };
  }
  if (trades.some((t) => t.strategy === "leaps")) {
    return { label: "LEAPS", key: "us_stock" };
  }
  return { label: "US Options", key: "us_options" };
}

function buildUsMarketTickerRow(
  ticker: string,
  holding: EnrichedStockEtfHolding | null,
  trades: EnrichedTrade[],
  dividendTotals?: Map<string, TickerDividendTotals>
): UsMarketTickerRow {
  const category = resolveUsCategory(holding, trades);
  const usCategory = holding
    ? classifyHoldingCategory(holding) === US_ETF_TAB
      ? US_ETF_TAB
      : US_STOCK_TAB
    : US_STOCK_TAB;

  const equity = buildUsEquityPositionRow(
    ticker,
    usCategory,
    holding,
    trades
  );

  const dividendResolved = resolveTickerDividendIncome(
    ticker,
    dividendTotals ?? new Map()
  );
  const dividendIncome = dividendResolved.lifetimeNetDividends;
  const annualDividendIncome = dividendResolved.annualDividendIncome;
  const annualPremiumIncome = estimateAnnualPremiumIncome(trades);
  const adjustedCostBasis = calculateAdjustedCostBasisUs(
    equity.originalCostBasis,
    equity.premiumCollected,
    dividendIncome
  );
  const currentValue = equity.currentAssetValue;
  const capitalDeployed = equity.originalCostBasis;
  const netPositionPnl = calculateNetPositionPnl(currentValue, adjustedCostBasis);

  const incomeTradePnl = trades
    .filter((t) => !isLongTermStrategy(t.strategy))
    .reduce(
      (s, t) => s + calculateMyPnL(t, calculateTotalTradePnL(t)),
      0
    );

  const totalPnl = netPositionPnl + incomeTradePnl + dividendIncome;
  const incomeYieldPct = calculateIncomeYieldPct(
    annualPremiumIncome + annualDividendIncome,
    capitalDeployed
  );

  const realizedPnl = trades
    .filter((t) => !isOpenTrade(t))
    .reduce(
      (s, t) => s + calculateMyPnL(t, calculateTotalTradePnL(t)),
      0
    );
  const unrealizedPnl = totalPnl - realizedPnl;

  return {
    ticker,
    category: category.label,
    marketCategory: category.key,
    currentValue,
    capitalDeployed,
    premiumCollected: equity.premiumCollected,
    dividendIncome,
    annualPremiumIncome,
    annualDividendIncome,
    incomeYieldPct,
    adjustedCostBasis,
    realizedPnl,
    unrealizedPnl,
    totalPnl,
    roiPct: calculateRoiPct(totalPnl, capitalDeployed),
    openTradesCount: equity.openTradesCount,
    closedTradesCount: equity.closedTradesCount,
  };
}

function buildSgMarketTickerRow(
  holding: EnrichedStockEtfHolding,
  dividendTotals?: Map<string, TickerDividendTotals>
): SgMarketTickerRow {
  const capitalDeployed = holding.totalInvestedNative;
  const currentValue = holding.currentValueNative;
  const dividendResolved = resolveTickerDividendIncome(
    holding.ticker,
    dividendTotals ?? new Map()
  );
  const dividendIncome = dividendResolved.lifetimeNetDividends;
  const annualDividendIncome = dividendResolved.annualDividendIncome;
  const adjustedCostBasis = calculateAdjustedCostBasisSg(
    capitalDeployed,
    dividendIncome
  );
  const netPositionPnl = calculateNetPositionPnl(currentValue, adjustedCostBasis);
  const totalPnl = netPositionPnl + dividendIncome;

  let category = "SG Stock";
  if (holding.assetType === "etf") category = "SG ETF";
  else if (holding.sector?.toLowerCase().includes("reit")) category = "SG REIT";

  return {
    ticker: holding.ticker.toUpperCase(),
    category,
    currentValue,
    capitalDeployed,
    dividendIncome,
    annualDividendIncome,
    dividendYield:
      holding.dividendYield ??
      (currentValue > 0 ? (annualDividendIncome / currentValue) * 100 : null),
    incomeYieldPct: calculateIncomeYieldPct(annualDividendIncome, capitalDeployed),
    adjustedCostBasis,
    realizedPnl: 0,
    unrealizedPnl: netPositionPnl,
    totalPnl,
    roiPct: calculateRoiPct(totalPnl, capitalDeployed),
  };
}

function summarizeUs(rows: UsMarketTickerRow[]): UsMarketSummary {
  const sorted = [...rows].sort((a, b) => b.totalPnl - a.totalPnl);
  const totalPremiumCollected = rows.reduce((s, r) => s + r.premiumCollected, 0);
  const totalDividendIncome = rows.reduce((s, r) => s + r.dividendIncome, 0);
  const totalAnnualPremiumIncome = rows.reduce(
    (s, r) => s + r.annualPremiumIncome,
    0
  );
  const totalAnnualDividendIncome = rows.reduce(
    (s, r) => s + r.annualDividendIncome,
    0
  );
  const totalCapitalDeployed = rows.reduce((s, r) => s + r.capitalDeployed, 0);
  const yieldRows = rows.filter((r) => r.capitalDeployed > 0);

  return {
    totalMarketValue: rows.reduce((s, r) => s + r.currentValue, 0),
    totalPremiumCollected,
    totalDividendIncome,
    totalPassiveIncome: totalPremiumCollected + totalDividendIncome,
    averageIncomeYieldPct:
      yieldRows.length > 0
        ? yieldRows.reduce((s, r) => s + r.incomeYieldPct, 0) / yieldRows.length
        : 0,
    totalPnl: rows.reduce((s, r) => s + r.totalPnl, 0),
    totalCapitalDeployed,
    totalAnnualPremiumIncome,
    totalAnnualDividendIncome,
    bestTicker: sorted[0] ? { ticker: sorted[0].ticker, totalPnl: sorted[0].totalPnl } : null,
    worstTicker: sorted.at(-1)
      ? { ticker: sorted.at(-1)!.ticker, totalPnl: sorted.at(-1)!.totalPnl }
      : null,
  };
}

function summarizeSg(rows: SgMarketTickerRow[]): SgMarketSummary {
  const sorted = [...rows].sort((a, b) => b.totalPnl - a.totalPnl);
  const totalDividendIncome = rows.reduce((s, r) => s + r.dividendIncome, 0);
  const totalAnnualDividendIncome = rows.reduce(
    (s, r) => s + r.annualDividendIncome,
    0
  );
  const totalCapitalDeployed = rows.reduce((s, r) => s + r.capitalDeployed, 0);
  const yieldRows = rows.filter((r) => r.capitalDeployed > 0);

  return {
    totalMarketValue: rows.reduce((s, r) => s + r.currentValue, 0),
    totalDividendIncome,
    totalPassiveIncome: totalDividendIncome,
    averageIncomeYieldPct:
      yieldRows.length > 0
        ? yieldRows.reduce((s, r) => s + r.incomeYieldPct, 0) / yieldRows.length
        : 0,
    totalPnl: rows.reduce((s, r) => s + r.totalPnl, 0),
    totalCapitalDeployed,
    totalAnnualDividendIncome,
    bestTicker: sorted[0] ? { ticker: sorted[0].ticker, totalPnl: sorted[0].totalPnl } : null,
    worstTicker: sorted.at(-1)
      ? { ticker: sorted.at(-1)!.ticker, totalPnl: sorted.at(-1)!.totalPnl }
      : null,
  };
}

export function buildUsMarketData(
  holdings: EnrichedStockEtfHolding[],
  trades: EnrichedTrade[],
  dividendTotals?: Map<string, TickerDividendTotals>
): { rows: UsMarketTickerRow[]; summary: UsMarketSummary } {
  const usHoldings = holdings.filter((h) => h.currency === "USD");
  const tickerSet = new Set<string>();
  for (const h of usHoldings) tickerSet.add(h.ticker.toUpperCase());
  for (const t of trades) {
    if (t.ticker) tickerSet.add(t.ticker.toUpperCase());
  }

  const rows = [...tickerSet]
    .map((ticker) => {
      const holding =
        usHoldings.find((h) => h.ticker.toUpperCase() === ticker) ?? null;
      const tickerTrades = trades.filter(
        (t) => t.ticker.toUpperCase() === ticker
      );
      if (!holding && tickerTrades.length === 0) return null;
      return buildUsMarketTickerRow(ticker, holding, tickerTrades, dividendTotals);
    })
    .filter((r): r is UsMarketTickerRow => r != null)
    .sort((a, b) => b.totalPnl - a.totalPnl);

  return { rows, summary: summarizeUs(rows) };
}

export function buildSgMarketData(
  holdings: EnrichedStockEtfHolding[],
  dividendTotals?: Map<string, TickerDividendTotals>
): { rows: SgMarketTickerRow[]; summary: SgMarketSummary } {
  const sgHoldings = holdings.filter((h) => h.currency === "SGD");
  const rows = sgHoldings
    .map((h) => buildSgMarketTickerRow(h, dividendTotals))
    .sort((a, b) => b.totalPnl - a.totalPnl);

  return { rows, summary: summarizeSg(rows) };
}

export function buildMarketPerformanceReport(
  usRows: UsMarketTickerRow[],
  sgRows: SgMarketTickerRow[]
): MarketPerformanceReport {
  const usSorted = [...usRows].sort((a, b) => b.totalPnl - a.totalPnl);
  const sgSorted = [...sgRows].sort((a, b) => b.totalPnl - a.totalPnl);

  const topPremiumGenerators: PremiumGeneratorRow[] = [...usRows]
    .filter((r) => r.premiumCollected > 0)
    .map((r) => ({
      ticker: r.ticker,
      premiumCollected: r.premiumCollected,
      premiumYieldPct: calculateIncomeYieldPct(
        r.annualPremiumIncome,
        r.capitalDeployed
      ),
    }))
    .sort((a, b) => b.premiumCollected - a.premiumCollected);

  const topDividendGenerators: DividendGeneratorRow[] = [
    ...usRows.map((r) => ({
      ticker: r.ticker,
      annualDividendIncome: r.annualDividendIncome,
      dividendYield:
        r.currentValue > 0
          ? (r.annualDividendIncome / r.currentValue) * 100
          : null,
    })),
    ...sgRows.map((r) => ({
      ticker: r.ticker,
      annualDividendIncome: r.annualDividendIncome,
      dividendYield: r.dividendYield,
    })),
  ]
    .filter((r) => r.annualDividendIncome > 0)
    .sort((a, b) => b.annualDividendIncome - a.annualDividendIncome);

  const topPassiveIncomeGenerators: PassiveIncomeGeneratorRow[] = usRows
    .map((r) => ({
      ticker: r.ticker,
      premiumIncome: r.annualPremiumIncome,
      dividendIncome: r.annualDividendIncome,
      totalPassiveIncome: r.annualPremiumIncome + r.annualDividendIncome,
      incomeYieldPct: r.incomeYieldPct,
    }))
    .concat(
      sgRows.map((r) => ({
        ticker: r.ticker,
        premiumIncome: 0,
        dividendIncome: r.annualDividendIncome,
        totalPassiveIncome: r.annualDividendIncome,
        incomeYieldPct: r.incomeYieldPct,
      }))
    )
    .filter((r) => r.totalPassiveIncome > 0)
    .sort((a, b) => b.totalPassiveIncome - a.totalPassiveIncome);

  return {
    usTopPerformers: usSorted.slice(0, 5),
    usWorstPerformers: [...usSorted].reverse().slice(0, 5),
    sgTopPerformers: sgSorted.slice(0, 5),
    sgWorstPerformers: [...sgSorted].reverse().slice(0, 5),
    usPremiumByTicker: [...usRows]
      .filter((r) => r.premiumCollected > 0)
      .map((r) => ({ ticker: r.ticker, premiumCollected: r.premiumCollected }))
      .sort((a, b) => b.premiumCollected - a.premiumCollected),
    usDividendByTicker: usRows
      .filter((r) => r.dividendIncome > 0 || r.annualDividendIncome > 0)
      .map((r) => ({
        ticker: r.ticker,
        dividendIncome: r.dividendIncome,
        annualDividendIncome: r.annualDividendIncome,
      }))
      .sort((a, b) => b.annualDividendIncome - a.annualDividendIncome),
    sgDividendByTicker: sgRows
      .filter((r) => r.dividendIncome > 0)
      .map((r) => ({
        ticker: r.ticker,
        dividendIncome: r.dividendIncome,
        annualDividendIncome: r.annualDividendIncome,
      }))
      .sort((a, b) => b.annualDividendIncome - a.annualDividendIncome),
    usHighestIncomeYield: [...usRows]
      .filter((r) => r.incomeYieldPct > 0)
      .sort((a, b) => b.incomeYieldPct - a.incomeYieldPct)
      .slice(0, 5),
    sgHighestIncomeYield: [...sgRows]
      .filter((r) => r.incomeYieldPct > 0)
      .sort((a, b) => b.incomeYieldPct - a.incomeYieldPct)
      .slice(0, 5),
    topPremiumGenerators: topPremiumGenerators.slice(0, 10),
    topDividendGenerators: topDividendGenerators.slice(0, 10),
    topPassiveIncomeGenerators: topPassiveIncomeGenerators.slice(0, 10),
  };
}

export function buildPortfolioIncomeSummary(
  us: UsMarketSummary,
  sg: SgMarketSummary,
  usMarketValueSgd: number,
  sgMarketValueSgd: number
): PortfolioIncomeSummary {
  const totalCapitalDeployed = us.totalCapitalDeployed + sg.totalCapitalDeployed;
  const totalAnnualPassive =
    us.totalAnnualPremiumIncome +
    us.totalAnnualDividendIncome +
    sg.totalAnnualDividendIncome;

  return {
    totalPremiumCollected: us.totalPremiumCollected,
    totalDividendIncome:
      us.totalAnnualDividendIncome + sg.totalAnnualDividendIncome,
    usDividendIncome: us.totalAnnualDividendIncome,
    sgDividendIncome: sg.totalAnnualDividendIncome,
    totalPassiveIncome:
      us.totalAnnualPremiumIncome +
      us.totalAnnualDividendIncome +
      sg.totalAnnualDividendIncome,
    portfolioIncomeYieldPct: calculateIncomeYieldPct(
      totalAnnualPassive,
      totalCapitalDeployed
    ),
    totalCapitalDeployed,
    usMarketValueSgd,
    sgMarketValueSgd,
  };
}
