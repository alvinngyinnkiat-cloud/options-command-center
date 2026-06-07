import { getAggregatedIntelligenceImpacts } from "@/lib/supabase/queries/market-intelligence";
import { getOptionsTradesData } from "@/lib/supabase/queries/options-trades";
import { getRiskDashboardData } from "@/lib/supabase/queries/risk-dashboard";
import { getWatchlistScannerData } from "@/lib/supabase/queries/watchlist-scanner";
import { getWeekendReviewStatus } from "@/lib/supabase/queries/weekly-market-updates";
import { buildCapitalLiquidityCheck } from "@/lib/risk/capital-liquidity";
import { buildExpectedReturnDashboard } from "./expected-return";
import { buildMarketCondition } from "./market-condition";
import { buildActiveTickerExposure } from "./one-trade-per-ticker";
import { buildReadinessForRows } from "./readiness";
import { buildTradeQueue } from "./trade-queue";
import type { TradeQueuePageData, TradingWorkflowData } from "./types";

export async function buildTradingWorkflowData(): Promise<TradingWorkflowData> {
  const scanner = await getWatchlistScannerData();
  const [trades, risk, reviewStatus, intelligenceMap] = await Promise.all([
    getOptionsTradesData(),
    getRiskDashboardData(),
    getWeekendReviewStatus(scanner.rows.length, scanner.dataSource),
    getAggregatedIntelligenceImpacts(),
  ]);

  const marketCondition = buildMarketCondition(
    scanner.rows,
    intelligenceMap
  );
  const tradeQueue = buildTradeQueue(
    scanner.rows,
    trades.trades,
    risk.capitalLiquidity,
    marketCondition
  );
  const expectedReturn = buildExpectedReturnDashboard(
    trades.trades,
    trades.summary
  );
  const allReadiness = buildReadinessForRows(scanner.rows, {
    openTrades: trades.trades,
    liquidityBase: risk.capitalLiquidity,
    reviewStatus,
    marketCondition,
  });

  return {
    tradeQueue,
    marketCondition,
    activeTickerExposure: buildActiveTickerExposure(
      trades.trades,
      scanner.rows.map((r) => r.ticker)
    ),
    expectedReturn,
    topReadiness: allReadiness.slice(0, 5),
    liquidityCheck: buildCapitalLiquidityCheck(risk.capitalLiquidity, 0),
    openTrades: trades.trades,
    dataSource: scanner.dataSource,
  };
}

export async function buildTradeQueuePageData(): Promise<TradeQueuePageData> {
  const scanner = await getWatchlistScannerData();
  const [trades, risk, reviewStatus, intelligenceMap] = await Promise.all([
    getOptionsTradesData(),
    getRiskDashboardData(),
    getWeekendReviewStatus(scanner.rows.length, scanner.dataSource),
    getAggregatedIntelligenceImpacts(),
  ]);

  const marketCondition = buildMarketCondition(scanner.rows, intelligenceMap);
  const allReadiness = buildReadinessForRows(scanner.rows, {
    openTrades: trades.trades,
    liquidityBase: risk.capitalLiquidity,
    reviewStatus,
    marketCondition,
  });

  return {
    tradeQueue: buildTradeQueue(
      scanner.rows,
      trades.trades,
      risk.capitalLiquidity,
      marketCondition
    ),
    marketCondition,
    activeTickerExposure: buildActiveTickerExposure(
      trades.trades,
      scanner.rows.map((r) => r.ticker)
    ),
    expectedReturn: buildExpectedReturnDashboard(trades.trades, trades.summary),
    topReadiness: allReadiness.slice(0, 5),
    allReadiness,
    liquidityCheck: buildCapitalLiquidityCheck(risk.capitalLiquidity, 0),
    openTrades: trades.trades,
    dataSource: scanner.dataSource,
  };
}
