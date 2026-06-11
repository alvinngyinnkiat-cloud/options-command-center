import { calculateProgressPercent } from "@/lib/goals/calculations";
import { computePassiveIncomeFromDividendSummary } from "@/lib/goals/passive-income-breakdown";
import type { DividendPortfolioSummary } from "@/lib/dividends/types";
import { DEFAULT_PASSIVE_INCOME_TARGET_SGD } from "@/lib/goals/types";
import { calculateIncomeYieldPct } from "./income-yield";
import type {
  AllMarketSummary,
  DividendGeneratorRow,
  IncomeFilter,
  IncomeTabSummary,
  MarketPerformanceReport,
  MarketTab,
  PassiveIncomeGeneratorRow,
  PassiveIncomeGoalProgress,
  PremiumGeneratorRow,
  SgMarketSummary,
  SgMarketTickerRow,
  UnifiedMarketTickerRow,
  UsMarketSummary,
  UsMarketTickerRow,
} from "./market-types";

export function getMarketTabHeader(tab: MarketTab): string {
  switch (tab) {
    case "all":
      return "All Markets";
    case "us":
      return "US Market";
    case "sg":
      return "SG Market";
    case "income":
      return "Income Dashboard";
  }
}

export function usRowToUnified(row: UsMarketTickerRow): UnifiedMarketTickerRow {
  const totalPassiveIncome = row.annualPremiumIncome + row.annualDividendIncome;
  return {
    ticker: row.ticker,
    market: "US",
    category: row.category,
    currency: "USD",
    currentValue: row.currentValue,
    capitalDeployed: row.capitalDeployed,
    premiumCollected: row.premiumCollected,
    dividendIncome: row.dividendIncome,
    annualPremiumIncome: row.annualPremiumIncome,
    annualDividendIncome: row.annualDividendIncome,
    totalPassiveIncome,
    incomeYieldPct: row.incomeYieldPct,
    adjustedCostBasis: row.adjustedCostBasis,
    capitalGainLoss: row.unrealizedPnl,
    totalReturn: row.totalPnl,
    roiPct: row.roiPct,
    realizedPnl: row.realizedPnl,
    unrealizedPnl: row.unrealizedPnl,
    openTradesCount: row.openTradesCount,
    closedTradesCount: row.closedTradesCount,
  };
}

export function sgRowToUnified(row: SgMarketTickerRow): UnifiedMarketTickerRow {
  return {
    ticker: row.ticker,
    market: "SG",
    category: row.category,
    currency: "SGD",
    currentValue: row.currentValue,
    capitalDeployed: row.capitalDeployed,
    premiumCollected: 0,
    dividendIncome: row.dividendIncome,
    annualPremiumIncome: 0,
    annualDividendIncome: row.annualDividendIncome,
    totalPassiveIncome: row.annualDividendIncome,
    incomeYieldPct: row.incomeYieldPct,
    adjustedCostBasis: row.adjustedCostBasis,
    capitalGainLoss: row.unrealizedPnl,
    totalReturn: row.totalPnl,
    roiPct: row.roiPct,
    realizedPnl: row.realizedPnl,
    unrealizedPnl: row.unrealizedPnl,
    dividendYield: row.dividendYield,
  };
}

export function buildUnifiedRows(
  usRows: UsMarketTickerRow[],
  sgRows: SgMarketTickerRow[]
): UnifiedMarketTickerRow[] {
  return [
    ...usRows.map(usRowToUnified),
    ...sgRows.map(sgRowToUnified),
  ].sort((a, b) => b.totalReturn - a.totalReturn);
}

export function summarizeAllMarket(
  usRows: UsMarketTickerRow[],
  sgRows: SgMarketTickerRow[],
  usSummary: UsMarketSummary,
  sgSummary: SgMarketSummary
): AllMarketSummary {
  const unified = buildUnifiedRows(usRows, sgRows);
  const sorted = [...unified].sort((a, b) => b.totalReturn - a.totalReturn);
  const yieldRows = unified.filter((r) => r.adjustedCostBasis > 0);

  return {
    totalMarketValue: usSummary.totalMarketValue + sgSummary.totalMarketValue,
    totalPremiumCollected: usSummary.totalPremiumCollected,
    totalDividendIncome:
      usSummary.totalDividendIncome + sgSummary.totalDividendIncome,
    totalPassiveIncome:
      usSummary.totalPassiveIncome + sgSummary.totalPassiveIncome,
    averageIncomeYieldPct:
      yieldRows.length > 0
        ? yieldRows.reduce((s, r) => s + r.incomeYieldPct, 0) / yieldRows.length
        : 0,
    totalPnl: usSummary.totalPnl + sgSummary.totalPnl,
    bestTicker: sorted[0]
      ? {
          ticker: sorted[0].ticker,
          totalPnl: sorted[0].totalReturn,
          market: sorted[0].market,
        }
      : null,
    worstTicker: sorted.at(-1)
      ? {
          ticker: sorted.at(-1)!.ticker,
          totalPnl: sorted.at(-1)!.totalReturn,
          market: sorted.at(-1)!.market,
        }
      : null,
  };
}

export function buildIncomeTabSummary(
  usRows: UsMarketTickerRow[],
  sgRows: SgMarketTickerRow[],
  usSummary: UsMarketSummary,
  sgSummary: SgMarketSummary
): IncomeTabSummary {
  const unified = buildUnifiedRows(usRows, sgRows);
  const annualPremiumIncome = usSummary.totalAnnualPremiumIncome;
  const annualDividendIncome =
    usSummary.totalAnnualDividendIncome + sgSummary.totalAnnualDividendIncome;
  const totalPassiveIncome = annualPremiumIncome + annualDividendIncome;
  const incomeRows = unified.filter((r) => r.totalPassiveIncome > 0);
  const yieldRows = unified.filter((r) => r.adjustedCostBasis > 0);
  const bestIncome = [...incomeRows].sort(
    (a, b) => b.totalPassiveIncome - a.totalPassiveIncome
  )[0];
  const highestYield = [...yieldRows].sort(
    (a, b) => b.incomeYieldPct - a.incomeYieldPct
  )[0];

  return {
    totalPassiveIncome,
    annualPremiumIncome,
    annualDividendIncome,
    averageIncomeYieldPct:
      yieldRows.length > 0
        ? yieldRows.reduce((s, r) => s + r.incomeYieldPct, 0) / yieldRows.length
        : calculateIncomeYieldPct(
            totalPassiveIncome,
            usSummary.totalCapitalDeployed + sgSummary.totalCapitalDeployed
          ),
    bestIncomeGenerator: bestIncome
      ? {
          ticker: bestIncome.ticker,
          totalPassiveIncome: bestIncome.totalPassiveIncome,
          market: bestIncome.market,
        }
      : null,
    highestYieldPosition: highestYield
      ? {
          ticker: highestYield.ticker,
          incomeYieldPct: highestYield.incomeYieldPct,
          market: highestYield.market,
        }
      : null,
    monthlyPassiveIncomeEstimate: totalPassiveIncome / 12,
    annualPassiveIncomeEstimate: totalPassiveIncome,
  };
}

export function buildPassiveIncomeGoalProgress(
  dividendSummary: Pick<
    DividendPortfolioSummary,
    "annualDividendSgd" | "usDividendSgdYtd" | "sgDividendSgdYtd"
  >,
  targetMonthlySgd = DEFAULT_PASSIVE_INCOME_TARGET_SGD
): PassiveIncomeGoalProgress {
  const currentMonthlySgd =
    computePassiveIncomeFromDividendSummary(dividendSummary).monthlySgd;
  const progressPercent = calculateProgressPercent(
    currentMonthlySgd,
    targetMonthlySgd
  );
  return {
    currentMonthlySgd,
    targetMonthlySgd,
    progressPercent,
    remainingMonthlySgd: Math.max(0, targetMonthlySgd - currentMonthlySgd),
  };
}

export function filterUnifiedRowsByTab(
  tab: MarketTab,
  usRows: UsMarketTickerRow[],
  sgRows: SgMarketTickerRow[]
): UnifiedMarketTickerRow[] {
  if (tab === "us") return usRows.map(usRowToUnified);
  if (tab === "sg") return sgRows.map(sgRowToUnified);
  return buildUnifiedRows(usRows, sgRows);
}

export function filterIncomeRows(
  rows: UnifiedMarketTickerRow[],
  filter: IncomeFilter
): UnifiedMarketTickerRow[] {
  let filtered = [...rows];
  switch (filter) {
    case "dividends":
      filtered = filtered.filter((r) => r.annualDividendIncome > 0);
      break;
    case "premium":
      filtered = filtered.filter((r) => r.annualPremiumIncome > 0);
      break;
    case "us_only":
      filtered = filtered.filter((r) => r.market === "US");
      break;
    case "sg_only":
      filtered = filtered.filter((r) => r.market === "SG");
      break;
    default:
      break;
  }

  if (filter === "highest_yield") {
    return filtered.sort((a, b) => b.incomeYieldPct - a.incomeYieldPct);
  }
  if (filter === "highest_income") {
    return filtered.sort((a, b) => b.totalPassiveIncome - a.totalPassiveIncome);
  }
  return filtered.sort((a, b) => b.totalPassiveIncome - a.totalPassiveIncome);
}

export interface TabLeaderboards {
  showPremiumGenerators: boolean;
  showDividendGenerators: boolean;
  showPassiveIncomeGenerators: boolean;
  topPremiumGenerators: PremiumGeneratorRow[];
  topDividendGenerators: DividendGeneratorRow[];
  topPassiveIncomeGenerators: PassiveIncomeGeneratorRow[];
}

export function buildTabLeaderboards(
  tab: MarketTab,
  report: MarketPerformanceReport,
  usRows: UsMarketTickerRow[],
  sgRows: SgMarketTickerRow[]
): TabLeaderboards {
  const usPremium = report.topPremiumGenerators.filter((r) =>
    usRows.some((u) => u.ticker === r.ticker)
  );
  const usDividends = report.topDividendGenerators.filter((r) =>
    usRows.some((u) => u.ticker === r.ticker)
  );
  const sgDividends = report.topDividendGenerators.filter((r) =>
    sgRows.some((s) => s.ticker === r.ticker)
  );

  if (tab === "sg") {
    return {
      showPremiumGenerators: false,
      showDividendGenerators: true,
      showPassiveIncomeGenerators: false,
      topPremiumGenerators: [],
      topDividendGenerators: sgDividends.slice(0, 10),
      topPassiveIncomeGenerators: [],
    };
  }

  if (tab === "us") {
    return {
      showPremiumGenerators: true,
      showDividendGenerators: true,
      showPassiveIncomeGenerators: false,
      topPremiumGenerators: usPremium.slice(0, 10),
      topDividendGenerators: usDividends.slice(0, 10),
      topPassiveIncomeGenerators: [],
    };
  }

  if (tab === "income") {
    return {
      showPremiumGenerators: true,
      showDividendGenerators: true,
      showPassiveIncomeGenerators: true,
      topPremiumGenerators: usPremium.slice(0, 10),
      topDividendGenerators: report.topDividendGenerators.slice(0, 10),
      topPassiveIncomeGenerators: report.topPassiveIncomeGenerators.slice(0, 10),
    };
  }

  return {
    showPremiumGenerators: true,
    showDividendGenerators: true,
    showPassiveIncomeGenerators: false,
    topPremiumGenerators: usPremium.slice(0, 10),
    topDividendGenerators: report.topDividendGenerators.slice(0, 10),
    topPassiveIncomeGenerators: [],
  };
}

export function shouldShowMarketReports(tab: MarketTab): boolean {
  return tab !== "income";
}

export function getMarketReportSections(
  tab: MarketTab,
  report: MarketPerformanceReport
) {
  if (tab === "us") {
    return {
      bestPerformers: report.usTopPerformers,
      worstPerformers: report.usWorstPerformers,
      highestIncomeYield: report.usHighestIncomeYield,
      bestLabel: "Best Performing US Tickers",
      worstLabel: "Worst Performing US Tickers",
      yieldLabel: "Highest US Income Yield",
    };
  }
  if (tab === "sg") {
    return {
      bestPerformers: report.sgTopPerformers,
      worstPerformers: report.sgWorstPerformers,
      highestIncomeYield: report.sgHighestIncomeYield,
      bestLabel: "Best Performing SG Tickers",
      worstLabel: "Worst Performing SG Tickers",
      yieldLabel: "Highest SG Income Yield",
    };
  }
  return {
    bestPerformers: [...report.usTopPerformers, ...report.sgTopPerformers],
    worstPerformers: [...report.usWorstPerformers, ...report.sgWorstPerformers],
    highestIncomeYield: [
      ...report.usHighestIncomeYield,
      ...report.sgHighestIncomeYield,
    ].sort((a, b) => b.incomeYieldPct - a.incomeYieldPct),
    bestLabel: "Best Performing Tickers",
    worstLabel: "Worst Performing Tickers",
    yieldLabel: "Highest Income Yield",
  };
}
