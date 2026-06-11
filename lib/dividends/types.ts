import type { EnrichedStockEtfHolding } from "@/lib/stocks-etfs/types";
import type {
  DividendCategory,
  DividendMarket,
  DividendRecordRow,
  DividendSource,
  DividendStatus,
} from "@/types/database";

export type {
  DividendCategory,
  DividendMarket,
  DividendRecordRow,
  DividendSource,
  DividendStatus,
} from "@/types/database";

export interface DividendFormInput {
  ticker: string;
  market: DividendMarket;
  category: DividendCategory;
  exDividendDate: string | null;
  recordDate: string | null;
  paymentDate: string | null;
  dividendPerShare: number;
  sharesHeld: number;
  grossDividend?: number;
  withholdingTax: number;
  netDividend?: number;
  currency: string;
  sgdEquivalent?: number;
  fxRateToSgd: number | null;
  source: DividendSource;
  status: DividendStatus;
  isReceived: boolean;
  notes: string | null;
  holdingId?: string | null;
}

export interface TickerDividendTotals {
  ticker: string;
  market: DividendMarket;
  category: DividendCategory;
  netReceivedLifetime: number;
  netReceivedYtd: number;
  netReceivedAnnualTrailing: number;
  grossReceivedYtd: number;
  upcomingCount: number;
  hasManualOverride: boolean;
}

export function isUsDividendCategory(category: DividendCategory): boolean {
  return category === "us_etf" || category === "us_stock";
}

export function isSgDividendCategory(category: DividendCategory): boolean {
  return category === "sg_stock" || category === "sg_reit";
}

export interface DividendPortfolioSummary {
  totalNetDividendsYtd: number;
  usNetDividendsYtd: number;
  sgNetDividendsYtd: number;
  totalNetDividendsLifetime: number;
  /** All received US ETF + US Stock — SGD (manual sgd_equivalent). */
  usDividendSgd: number;
  /** All received US ETF + US Stock — USD (net_dividend). */
  usDividendUsd: number;
  /** All received SG Stock + REIT — SGD. */
  sgDividendSgd: number;
  /** US SGD + SG SGD (all received). */
  totalDividendSgd: number;
  /** YTD received — US dividends in SGD (passive income). */
  usDividendSgdYtd: number;
  /** YTD received — SG dividends in SGD (passive income). */
  sgDividendSgdYtd: number;
  /** Annual dividend total in SGD for passive income (YTD, else trailing 12mo). */
  annualDividendSgd: number;
  byTicker: Map<string, TickerDividendTotals>;
  upcoming: DividendRecordView[];
  received: DividendRecordView[];
  calendar: DividendRecordView[];
}

export interface DividendRecordView {
  id: string;
  ticker: string;
  market: DividendMarket;
  category: DividendCategory;
  categoryLabel: string;
  exDividendDate: string | null;
  recordDate: string | null;
  paymentDate: string | null;
  dividendPerShare: number;
  sharesHeld: number;
  grossDividend: number;
  withholdingTax: number;
  netDividend: number;
  currency: string;
  sgdEquivalent: number;
  fxRateToSgd: number | null;
  source: DividendSource;
  status: DividendStatus;
  isManualOverride: boolean;
  isReceived: boolean;
  notes: string | null;
  holdingId: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface DividendTrackerData {
  records: DividendRecordView[];
  summary: DividendPortfolioSummary;
  byMarket: { market: DividendMarket; totalNetYtd: number; count: number }[];
  yieldRanking: { ticker: string; categoryLabel: string; dividendYieldPct: number; annualIncome: number }[];
  dataSource: "supabase" | "unconfigured";
  providerSource: "fmp" | "alpha_vantage" | "none";
}

export function classifyDividendCategory(
  holding: Pick<EnrichedStockEtfHolding, "assetType" | "currency" | "sector">
): DividendCategory {
  if (holding.currency === "SGD") {
    if (holding.sector?.toLowerCase().includes("reit")) return "sg_reit";
    return "sg_stock";
  }
  if (holding.assetType === "etf") return "us_etf";
  return "us_stock";
}

export function dividendCategoryLabel(category: DividendCategory): string {
  switch (category) {
    case "us_etf":
      return "US ETF";
    case "us_stock":
      return "US Stock";
    case "sg_stock":
      return "SG Stock";
    case "sg_reit":
      return "SG REIT";
  }
}

export function marketFromHolding(
  holding: Pick<EnrichedStockEtfHolding, "currency">
): DividendMarket {
  return holding.currency === "SGD" ? "SG" : "US";
}

export function mapDividendRecordView(row: DividendRecordRow): DividendRecordView {
  return {
    id: row.id,
    ticker: row.ticker,
    market: row.market,
    category: row.category,
    categoryLabel: dividendCategoryLabel(row.category),
    exDividendDate: row.ex_dividend_date,
    recordDate: row.record_date,
    paymentDate: row.payment_date,
    dividendPerShare: Number(row.dividend_per_share),
    sharesHeld: Number(row.shares_held),
    grossDividend: Number(row.gross_dividend),
    withholdingTax: Number(row.withholding_tax),
    netDividend: Number(row.net_dividend),
    currency: row.currency,
    sgdEquivalent: Number(row.sgd_equivalent),
    fxRateToSgd: row.fx_rate_to_sgd != null ? Number(row.fx_rate_to_sgd) : null,
    source: row.source,
    status: row.status,
    isManualOverride: row.is_manual_override,
    isReceived: row.is_received,
    notes: row.notes,
    holdingId: row.holding_id,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}
