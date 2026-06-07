import { buildDividendPortfolioSummary } from "@/lib/dividends/calculations";
import { MOCK_REFERENCE_DATE } from "@/lib/mock/reference-dates";
import { getOptionsTradesData } from "@/lib/supabase/queries/options-trades";
import { listDividendRecordRows } from "@/lib/supabase/queries/dividend-records";
import { getStockEtfTrackerData } from "@/lib/supabase/queries/stock-etf-holdings";
import { buildCategoryValuesSgd } from "@/lib/stocks-etfs/build-tab-data";
import type { DataSource } from "@/lib/portfolio/types";
import { isSupabaseConfigured } from "@/lib/supabase/is-configured";
import { createClient } from "@/lib/supabase/server";
import {
  buildMarketPerformanceReport,
  buildPortfolioIncomeSummary,
  buildSgMarketData,
  buildUsMarketData,
} from "@/lib/ticker-positions/market-aggregate";
import type {
  MarketPerformanceReport,
  PortfolioIncomeSummary,
  SgMarketSummary,
  SgMarketTickerRow,
  UsMarketSummary,
  UsMarketTickerRow,
} from "@/lib/ticker-positions/market-types";

export interface TickerPositionManagerData {
  usMarket: { rows: UsMarketTickerRow[]; summary: UsMarketSummary };
  sgMarket: { rows: SgMarketTickerRow[]; summary: SgMarketSummary };
  report: MarketPerformanceReport;
  portfolioIncome: PortfolioIncomeSummary;
  dataSource: DataSource;
}

async function resolveUserId(): Promise<string> {
  if (!isSupabaseConfigured()) return "mock-user";
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user?.id ?? "mock-user";
}

export async function getTickerPositionManagerData(): Promise<TickerPositionManagerData> {
  const userId = await resolveUserId();
  const referenceDate = MOCK_REFERENCE_DATE;
  const referenceYear = Number(referenceDate.slice(0, 4));

  const [tradesData, stockData, dividendRows] = await Promise.all([
    getOptionsTradesData(),
    getStockEtfTrackerData(),
    listDividendRecordRows(userId),
  ]);

  const dividendSummary = buildDividendPortfolioSummary(
    dividendRows,
    referenceDate,
    referenceYear
  );

  const holdings = stockData.holdings;
  const usMarket = buildUsMarketData(
    holdings,
    tradesData.trades,
    dividendSummary.byTicker
  );
  const sgMarket = buildSgMarketData(holdings, dividendSummary.byTicker);
  const categories = buildCategoryValuesSgd(holdings);

  const portfolioIncome = buildPortfolioIncomeSummary(
    usMarket.summary,
    sgMarket.summary,
    categories.usEtfValueSgd + categories.usStockValueSgd,
    categories.sgStockValueSgd
  );

  return {
    usMarket,
    sgMarket,
    report: buildMarketPerformanceReport(usMarket.rows, sgMarket.rows),
    portfolioIncome,
    dataSource: tradesData.dataSource,
  };
}
