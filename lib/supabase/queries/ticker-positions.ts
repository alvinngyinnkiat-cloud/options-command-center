import { buildDividendPortfolioSummary } from "@/lib/dividends/calculations";
import { MOCK_REFERENCE_DATE } from "@/lib/mock/reference-dates";
import { getOptionsTradesData } from "@/lib/supabase/queries/options-trades";
import { listDividendRecordRows } from "@/lib/supabase/queries/dividend-records";
import { getStockEtfTrackerData } from "@/lib/supabase/queries/stock-etf-holdings";
import { buildCategoryValuesSgd } from "@/lib/stocks-etfs/build-tab-data";
import type { DataSource } from "@/lib/portfolio/types";
import { resolveUserId } from "@/lib/supabase/resolve-user";
import {
  buildMarketPerformanceReport,
  buildPortfolioIncomeSummary,
  buildSgMarketData,
  buildUsMarketData,
} from "@/lib/ticker-positions/market-aggregate";
import {
  buildIncomeTabSummary,
  buildPassiveIncomeGoalProgress,
  summarizeAllMarket,
} from "@/lib/ticker-positions/tab-views";
import type {
  AllMarketSummary,
  IncomeTabSummary,
  MarketPerformanceReport,
  PassiveIncomeGoalProgress,
  PortfolioIncomeSummary,
  SgMarketSummary,
  SgMarketTickerRow,
  UsMarketSummary,
  UsMarketTickerRow,
} from "@/lib/ticker-positions/market-types";
import { DEFAULT_PASSIVE_INCOME_TARGET_SGD } from "@/lib/goals/types";
import { getFinancialGoalsManagementData } from "@/lib/supabase/queries/financial-goals";

export interface TickerPositionManagerData {
  usMarket: { rows: UsMarketTickerRow[]; summary: UsMarketSummary };
  sgMarket: { rows: SgMarketTickerRow[]; summary: SgMarketSummary };
  allMarketSummary: AllMarketSummary;
  incomeTab: IncomeTabSummary;
  passiveIncomeGoal: PassiveIncomeGoalProgress;
  report: MarketPerformanceReport;
  portfolioIncome: PortfolioIncomeSummary;
  dataSource: DataSource;
}

async function resolveTickerUserId(): Promise<string> {
  return resolveUserId();
}

export async function getTickerPositionManagerData(): Promise<TickerPositionManagerData> {
  const userId = await resolveTickerUserId();
  const referenceDate = MOCK_REFERENCE_DATE;
  const referenceYear = Number(referenceDate.slice(0, 4));

  const [tradesData, stockData, dividendRows, goalsManagement] = await Promise.all([
    getOptionsTradesData(),
    getStockEtfTrackerData(),
    listDividendRecordRows(userId),
    getFinancialGoalsManagementData(userId).catch(() => null),
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

  const incomeGoal = goalsManagement?.goals.find(
    (g) => g.goalType === "income" && !g.isArchived
  );
  const targetMonthlySgd = incomeGoal
    ? incomeGoal.targetAmount
    : DEFAULT_PASSIVE_INCOME_TARGET_SGD;

  return {
    usMarket,
    sgMarket,
    allMarketSummary: summarizeAllMarket(
      usMarket.rows,
      sgMarket.rows,
      usMarket.summary,
      sgMarket.summary
    ),
    incomeTab: buildIncomeTabSummary(
      usMarket.rows,
      sgMarket.rows,
      usMarket.summary,
      sgMarket.summary
    ),
    passiveIncomeGoal: buildPassiveIncomeGoalProgress(
      usMarket.summary,
      sgMarket.summary,
      targetMonthlySgd
    ),
    report: buildMarketPerformanceReport(usMarket.rows, sgMarket.rows),
    portfolioIncome,
    dataSource: tradesData.dataSource,
  };
}
