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

export interface AllMarketSummary {
  totalMarketValue: number;
  totalPremiumCollected: number;
  totalDividendIncome: number;
  totalPassiveIncome: number;
  averageIncomeYieldPct: number;
  totalPnl: number;
  bestTicker: { ticker: string; totalPnl: number; market: "US" | "SG" } | null;
  worstTicker: { ticker: string; totalPnl: number; market: "US" | "SG" } | null;
}

export interface IncomeTabSummary {
  totalPassiveIncome: number;
  annualPremiumIncome: number;
  annualDividendIncome: number;
  averageIncomeYieldPct: number;
  bestIncomeGenerator: { ticker: string; totalPassiveIncome: number; market: "US" | "SG" } | null;
  highestYieldPosition: { ticker: string; incomeYieldPct: number; market: "US" | "SG" } | null;
  monthlyPassiveIncomeEstimate: number;
  annualPassiveIncomeEstimate: number;
}

export interface PassiveIncomeGoalProgress {
  currentMonthlySgd: number;
  targetMonthlySgd: number;
  progressPercent: number;
  remainingMonthlySgd: number;
}

export interface UnifiedMarketTickerRow {
  ticker: string;
  market: "US" | "SG";
  category: string;
  currency: "USD" | "SGD";
  currentValue: number;
  capitalDeployed: number;
  premiumCollected: number;
  dividendIncome: number;
  annualPremiumIncome: number;
  annualDividendIncome: number;
  totalPassiveIncome: number;
  incomeYieldPct: number;
  adjustedCostBasis: number;
  capitalGainLoss: number;
  totalReturn: number;
  roiPct: number;
  realizedPnl: number;
  unrealizedPnl: number;
  openTradesCount?: number;
  closedTradesCount?: number;
  dividendYield?: number | null;
}

export type MarketTab = "all" | "us" | "sg" | "income";

export type IncomeFilter =
  | "all"
  | "dividends"
  | "premium"
  | "highest_yield"
  | "highest_income"
  | "us_only"
  | "sg_only";
