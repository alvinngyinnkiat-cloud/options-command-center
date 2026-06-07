import { getClientProfitSharingData } from "@/lib/supabase/queries/client-profit-sharing";
import { getCryptoHoldingsRows } from "@/lib/supabase/queries/crypto-holdings";
import { getOptionsTradesData } from "@/lib/supabase/queries/options-trades";
import { getStockEtfTrackerData } from "@/lib/supabase/queries/stock-etf-holdings";
import { buildCategoryValuesSgd } from "@/lib/stocks-etfs/build-tab-data";
import type { PortfolioMetrics } from "./types";
import {
  buildCapitalPoolsBreakdown,
  type CapitalPoolsBreakdown,
} from "./capital-pools";

function getOpenTrades(
  trades: Awaited<ReturnType<typeof getOptionsTradesData>>["trades"]
) {
  return trades.filter(
    (t) =>
      t.status === "open" ||
      t.status === "managed" ||
      t.status === "closing"
  );
}

export async function buildPortfolioCapitalPools(
  metrics: PortfolioMetrics
): Promise<CapitalPoolsBreakdown> {
  const [cryptoRows, stockData, tradesData, clientData] = await Promise.all([
    getCryptoHoldingsRows(),
    getStockEtfTrackerData(),
    getOptionsTradesData(),
    getClientProfitSharingData(),
  ]);

  const categories = buildCategoryValuesSgd(stockData.holdings);

  return buildCapitalPoolsBreakdown({
    holdings: metrics.holdings,
    cryptoRows,
    usEtfValueSgd: categories.usEtfValueSgd,
    usStockValueSgd: categories.usStockValueSgd,
    sgStockValueSgd: categories.sgStockValueSgd,
    openTrades: getOpenTrades(tradesData.trades),
    clientSummary: clientData.summary,
    tradeAllocations: clientData.tradeAllocations,
  });
}

export function applyCapitalPoolsToMetrics(
  metrics: PortfolioMetrics,
  pools: CapitalPoolsBreakdown
): PortfolioMetrics {
  return {
    ...metrics,
    portfolioValue: pools.myPortfolioValue,
    myPortfolioValue: pools.myPortfolioValue,
    tradingCapital: pools.tradingCapital,
    cryptoCapital: pools.cryptoCapital,
    tradingCashSgd: pools.tradingCashSgd,
    cryptoCashSgd: pools.cryptoCashSgd,
    totalCashSgd: pools.cash.totalCashSgd,
    cashValue: pools.tradingCashSgd,
    cryptoValue: pools.cryptoHoldingsSgd,
  };
}

export async function getEnrichedPortfolioMetrics(): Promise<{
  metrics: PortfolioMetrics;
  capitalPools: CapitalPoolsBreakdown;
}> {
  const { getPortfolioDashboardData } = await import(
    "@/lib/supabase/queries/portfolio"
  );
  const base = await getPortfolioDashboardData();
  const capitalPools = await buildPortfolioCapitalPools(base);
  return {
    metrics: applyCapitalPoolsToMetrics(base, capitalPools),
    capitalPools,
  };
}
