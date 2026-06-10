import { getAggregatedIntelligenceImpacts } from "@/lib/supabase/queries/market-intelligence";
import { getOptionsTradesData } from "@/lib/supabase/queries/options-trades";
import { getRiskDashboardData } from "@/lib/supabase/queries/risk-dashboard";
import { getWatchlistScannerData } from "@/lib/supabase/queries/watchlist-scanner";
import { buildCapitalLiquidityCheck } from "@/lib/risk/capital-liquidity";
import { buildExpectedReturnDashboard } from "./expected-return";
import { buildMarketCondition } from "./market-condition";
import { buildActiveTickerExposure } from "./one-trade-per-ticker";
import { buildTradeQueue } from "./trade-queue";
import type { TradeQueuePageData, TradingWorkflowData } from "./types";

export async function buildTradingWorkflowData(): Promise<TradingWorkflowData> {
  const scanner = await getWatchlistScannerData();
  const [trades, risk, intelligenceMap] = await Promise.all([
    getOptionsTradesData(),
    getRiskDashboardData(),
    getAggregatedIntelligenceImpacts(),
  ]);

  const marketCondition = buildMarketCondition(
    scanner.rows,
    intelligenceMap
  );

  return {
    tradeQueue: buildTradeQueue(scanner.rows),
    marketCondition,
    activeTickerExposure: buildActiveTickerExposure(
      trades.trades,
      scanner.rows.map((r) => r.ticker)
    ),
    expectedReturn: buildExpectedReturnDashboard(
      trades.trades,
      trades.summary
    ),
    liquidityCheck: buildCapitalLiquidityCheck(risk.capitalLiquidity, 0),
    openTrades: trades.trades,
    dataSource: scanner.dataSource,
  };
}

export async function buildTradeQueuePageData(): Promise<TradeQueuePageData> {
  return buildTradingWorkflowData();
}
