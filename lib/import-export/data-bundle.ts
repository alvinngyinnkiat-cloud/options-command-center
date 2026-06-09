import { getPortfolioDashboardData } from "@/lib/supabase/queries/portfolio";
import { getPortfolioHistoryData } from "@/lib/supabase/queries/daily-portfolio-snapshots";
import { getOptionsTradesData } from "@/lib/supabase/queries/options-trades";
import { getCryptoTrackerData } from "@/lib/supabase/queries/crypto-holdings";
import { getStockEtfTrackerData } from "@/lib/supabase/queries/stock-etf-holdings";
import { getWatchlistScannerData } from "@/lib/supabase/queries/watchlist-scanner";
import { getJournalTrackerData } from "@/lib/supabase/queries/trading-journal";
import { getRiskDashboardData } from "@/lib/supabase/queries/risk-dashboard";
import { getFinancialGoalsData } from "@/lib/supabase/queries/goals";
import { getWeekendReviewPageData } from "@/lib/supabase/queries/weekend-review-page";
import { MOCK_RISK_SETTINGS } from "@/lib/mock/risk-settings";
import { MOCK_PORTFOLIO_OVERRIDE } from "@/lib/mock/portfolio";
import { getMockPortfolioHoldings } from "@/lib/mock/portfolio-holdings-store";
import { getWatchlistImportEntries } from "@/lib/mock/watchlist-store";
import { getMockTrades } from "@/lib/mock/trades-store";
import { getMockCryptoHoldings } from "@/lib/mock/crypto-store";
import { getMockJournalEntries } from "@/lib/mock/journal-store";
import { getMockStockEtfHoldings } from "@/lib/mock/stock-etf-store";
import { isSupabaseConfigured } from "@/lib/supabase/is-configured";
import type { ImportExportPageData } from "./types";
import type { CsvExportEntity } from "./types";

export async function collectExportContext() {
  const portfolio = await getPortfolioDashboardData();
  const trades = await getOptionsTradesData();
  const portfolioHistory = await getPortfolioHistoryData({
    userId: "mock-user",
    metrics: portfolio,
    trades: trades.trades,
  });

  const [
    crypto,
    stocks,
    watchlist,
    journal,
    risk,
    goals,
    weekend,
  ] = await Promise.all([
    getCryptoTrackerData(),
    getStockEtfTrackerData(),
    getWatchlistScannerData(),
    getJournalTrackerData(),
    getRiskDashboardData(),
    getFinancialGoalsData(),
    getWeekendReviewPageData(),
  ]);

  return {
    portfolio,
    portfolioHistory,
    trades,
    crypto,
    stocks,
    watchlist,
    journal,
    risk,
    goals,
    weekend,
    settings: {
      riskSettings: MOCK_RISK_SETTINGS,
      portfolioOverride: MOCK_PORTFOLIO_OVERRIDE,
    },
    mockHoldings: getMockPortfolioHoldings(),
    watchlistEntries: getWatchlistImportEntries(),
    rawTrades: getMockTrades(),
    rawCrypto: getMockCryptoHoldings(),
    rawJournal: getMockJournalEntries(),
    rawStockEtf: getMockStockEtfHoldings(),
    dataSource: portfolio.dataSource,
  };
}

export async function getImportExportPageData(): Promise<ImportExportPageData> {
  const ctx = await collectExportContext();
  const counts: Record<CsvExportEntity, number> = {
    portfolio_holdings: ctx.portfolio.holdings?.length ?? ctx.mockHoldings.length,
    options_trades: ctx.trades.trades.length,
    crypto: ctx.crypto.holdings.length,
    watchlist: ctx.watchlist.rows.length,
    scanner_results: ctx.watchlist.rows.length,
    trading_journal: ctx.journal.entries.length,
    risk_dashboard: ctx.risk.openRiskByTicker.length,
    reports: ctx.trades.summary.closedTrades + 1,
  };

  return {
    dataSource: ctx.dataSource,
    exportCounts: counts,
    lastBackupAt: null,
  };
}

export function resolveDataSourceLabel(): "supabase" | "mock" {
  return isSupabaseConfigured() ? "supabase" : "mock";
}
