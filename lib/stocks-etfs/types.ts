import type { StockEtfLedgerEntry } from "@/types/database";
import type { DataSource } from "@/lib/portfolio/types";
import type { MarketCategory } from "./market-category";
import type { CurrencyCode } from "@/types/database";
import type { STOCK_ETF_SECTORS } from "./constants";
import type {
  UsEquityPositionRow,
  UsEquityTabSummary,
} from "./us-equity-positions";

export type { UsEquityPositionRow, UsEquityTabSummary };

export type StockEtfAssetType = "stock" | "etf";
export type StockEtfSector = (typeof STOCK_ETF_SECTORS)[number];

export interface StockEtfHoldingFormInput {
  ticker: string;
  assetType: StockEtfAssetType;
  currency: CurrencyCode;
  sector: StockEtfSector;
  totalInvestedNative: number;
  currentValueNative: number;
  fxRateToSgd: number;
  sharesHeld: number | null;
  averageCost: number | null;
  notes: string | null;
}

export interface StockEtfHoldingMetrics {
  totalInvestedSgd: number;
  currentValueSgd: number;
  profitLossSgd: number;
  returnPct: number;
  allocationPct: number;
}

export interface EnrichedStockEtfHolding {
  id: string;
  ticker: string;
  assetType: StockEtfAssetType;
  currency: CurrencyCode;
  sector: StockEtfSector;
  totalInvestedNative: number;
  currentValueNative: number;
  fxRateToSgd: number;
  totalInvestedSgd: number;
  currentValueSgd: number;
  profitLossSgd: number;
  returnPct: number;
  allocationPct: number;
  sharesHeld: number | null;
  averageCost: number | null;
  dividendYield: number | null;
  annualDividendIncome: number | null;
  notes: string | null;
  lastUpdated: string;
  createdAt: string;
  updatedAt: string;
}

export interface SgStockRow {
  holding: EnrichedStockEtfHolding;
  shares: number;
  averageCost: number | null;
  currentPrice: number | null;
  marketValue: number;
  unrealizedPnl: number;
  unrealizedPnlPct: number;
  dividendYield: number | null;
  annualDividendIncome: number | null;
  dividendIncome: number;
  adjustedCostBasis: number;
  totalPnl: number;
  roiPct: number;
  incomeYieldPct: number;
}

export interface SgStockTabSummary {
  /** Open position value (excludes trading cash). */
  positionValue: number;
  /** Open position value + SG trading cash. */
  currentValue: number;
  capitalInvested: number;
  totalPnl: number;
  roiPct: number;
  totalDividend: number;
  plWithDividend: number;
  tradingCash: number;
  totalFeesPaid: number;
  /** @deprecated Use positionValue */
  totalMarketValue: number;
  /** @deprecated Use capitalInvested */
  totalCapital: number;
  /** @deprecated Use totalDividend */
  totalDividendIncome: number;
  /** @deprecated Use roiPct */
  totalReturnPct: number;
  /** @deprecated Use tradingCash */
  cashBalance: number;
}

export interface StockEtfTabData {
  usEtf: { rows: UsEquityPositionRow[]; summary: UsEquityTabSummary };
  usStock: { rows: UsEquityPositionRow[]; summary: UsEquityTabSummary };
  sgStock: { rows: SgStockRow[]; summary: SgStockTabSummary };
}

export interface StockEtfCurrencyBreakdown {
  sgdHoldingsValueSgd: number;
  usdHoldingsValueNative: number;
  usdHoldingsValueSgd: number;
  totalSgdEquivalent: number;
}

export interface SectorAllocationEntry {
  sector: StockEtfSector;
  valueSgd: number;
  allocationPct: number;
}

export interface ConcentrationEntry {
  ticker: string;
  assetType: StockEtfAssetType;
  currentValueSgd: number;
  allocationPct: number;
}

export interface ConcentrationWarning {
  level: "warning" | "critical";
  type: "holding" | "sector";
  label: string;
  allocationPct: number;
  message: string;
}

export interface StockEtfTrackerSummary {
  totalInvestedSgd: number;
  totalCurrentValueSgd: number;
  totalProfitLossSgd: number;
  totalReturnPct: number;
  largestHolding: { ticker: string; valueSgd: number } | null;
  bestPerforming: { ticker: string; returnPct: number } | null;
  worstPerforming: { ticker: string; returnPct: number } | null;
  currencyBreakdown: StockEtfCurrencyBreakdown;
}

export interface StockEtfTrackerData {
  holdings: EnrichedStockEtfHolding[];
  summary: StockEtfTrackerSummary;
  sectorAllocation: SectorAllocationEntry[];
  topHoldings: ConcentrationEntry[];
  warnings: ConcentrationWarning[];
  tabs: StockEtfTabData;
  cashBalances: Record<MarketCategory, number>;
  ledger: StockEtfLedgerEntry[];
  totalFeesPaid: number;
  dataSource: DataSource;
}

export type StockEtfActionResult =
  | { success: true; data: StockEtfTrackerData }
  | { success: false; error: string };
