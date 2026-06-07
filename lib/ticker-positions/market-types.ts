import type { MarketCategory } from "@/lib/stocks-etfs/market-category";

export interface UsMarketTickerRow {
  ticker: string;
  category: string;
  marketCategory: MarketCategory | "us_options";
  currentValue: number;
  capitalDeployed: number;
  premiumCollected: number;
  dividendIncome: number;
  annualPremiumIncome: number;
  annualDividendIncome: number;
  incomeYieldPct: number;
  adjustedCostBasis: number;
  realizedPnl: number;
  unrealizedPnl: number;
  totalPnl: number;
  roiPct: number;
  openTradesCount: number;
  closedTradesCount: number;
}

export interface SgMarketTickerRow {
  ticker: string;
  category: string;
  currentValue: number;
  capitalDeployed: number;
  dividendIncome: number;
  annualDividendIncome: number;
  dividendYield: number | null;
  incomeYieldPct: number;
  adjustedCostBasis: number;
  realizedPnl: number;
  unrealizedPnl: number;
  totalPnl: number;
  roiPct: number;
}

export interface UsMarketSummary {
  totalMarketValue: number;
  totalPremiumCollected: number;
  totalDividendIncome: number;
  totalPassiveIncome: number;
  averageIncomeYieldPct: number;
  totalPnl: number;
  totalCapitalDeployed: number;
  totalAnnualPremiumIncome: number;
  totalAnnualDividendIncome: number;
  bestTicker: { ticker: string; totalPnl: number } | null;
  worstTicker: { ticker: string; totalPnl: number } | null;
}

export interface SgMarketSummary {
  totalMarketValue: number;
  totalDividendIncome: number;
  totalPassiveIncome: number;
  averageIncomeYieldPct: number;
  totalPnl: number;
  totalCapitalDeployed: number;
  totalAnnualDividendIncome: number;
  bestTicker: { ticker: string; totalPnl: number } | null;
  worstTicker: { ticker: string; totalPnl: number } | null;
}

export interface PremiumGeneratorRow {
  ticker: string;
  premiumCollected: number;
  premiumYieldPct: number;
}

export interface DividendGeneratorRow {
  ticker: string;
  annualDividendIncome: number;
  dividendYield: number | null;
}

export interface PassiveIncomeGeneratorRow {
  ticker: string;
  premiumIncome: number;
  dividendIncome: number;
  totalPassiveIncome: number;
  incomeYieldPct: number;
}

export interface MarketPerformanceReport {
  usTopPerformers: UsMarketTickerRow[];
  usWorstPerformers: UsMarketTickerRow[];
  sgTopPerformers: SgMarketTickerRow[];
  sgWorstPerformers: SgMarketTickerRow[];
  usPremiumByTicker: { ticker: string; premiumCollected: number }[];
  usDividendByTicker: { ticker: string; dividendIncome: number; annualDividendIncome: number }[];
  sgDividendByTicker: { ticker: string; dividendIncome: number; annualDividendIncome: number }[];
  usHighestIncomeYield: UsMarketTickerRow[];
  sgHighestIncomeYield: SgMarketTickerRow[];
  topPremiumGenerators: PremiumGeneratorRow[];
  topDividendGenerators: DividendGeneratorRow[];
  topPassiveIncomeGenerators: PassiveIncomeGeneratorRow[];
}

export interface PortfolioIncomeSummary {
  totalPremiumCollected: number;
  totalDividendIncome: number;
  usDividendIncome: number;
  sgDividendIncome: number;
  totalPassiveIncome: number;
  portfolioIncomeYieldPct: number;
  totalCapitalDeployed: number;
  usMarketValueSgd: number;
  sgMarketValueSgd: number;
}
