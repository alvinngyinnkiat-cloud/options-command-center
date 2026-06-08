import { getEnrichedPortfolioMetrics } from "@/lib/portfolio/enrich-capital-pools";
import { getPortfolioHistoryData } from "@/lib/supabase/queries/daily-portfolio-snapshots";
import { getOptionsTradesData } from "@/lib/supabase/queries/options-trades";
import { getTickerPositionManagerData } from "@/lib/supabase/queries/ticker-positions";
import { buildPortfolioCurrentState } from "@/lib/portfolio/current-state";
import { buildRiskFramework } from "@/lib/risk/calculations";
import { buildTradeTrackerSummary } from "@/lib/trades/summary";
import { calculateRiskShare } from "@/lib/trades/pnl-allocation";
import { getDataHealthWidget } from "@/lib/data-health/run-health-check";
import { isSupabaseConfigured } from "@/lib/supabase/is-configured";
import { MOCK_USER_ID, resolveAuthenticatedUserId } from "@/lib/supabase/resolve-user";
import { PortfolioDashboardClient } from "./PortfolioDashboardClient";

async function resolveUserId(): Promise<string> {
  if (!isSupabaseConfigured()) return MOCK_USER_ID;
  return (await resolveAuthenticatedUserId()) ?? MOCK_USER_ID;
}

export async function PortfolioDashboard() {
  const userId = await resolveUserId();
  const [{ metrics, capitalPools }, tradesData, tickerData, dataHealthLines] =
    await Promise.all([
    getEnrichedPortfolioMetrics(),
    getOptionsTradesData(),
    getTickerPositionManagerData(),
    getDataHealthWidget(userId),
  ]);

  const openTrades = tradesData.trades.filter(
    (t) =>
      t.status === "open" ||
      t.status === "managed" ||
      t.status === "closing"
  );
  const myOpenRisk = openTrades.reduce((s, t) => {
    const share = calculateRiskShare(
      t.calculations.maxRisk,
      t.tradeOwnership,
      t.myProfitSharePercent,
      t.clientProfitSharePercent
    );
    return s + share.myRisk;
  }, 0);

  const framework = buildRiskFramework({
    portfolioValue: capitalPools.tradingCapital,
    currentOpenRisk: myOpenRisk,
  });

  const metricsWithRisk = {
    ...metrics,
    availableRiskCapacity: framework.availableRiskCapacity,
  };

  const portfolioHistory = await getPortfolioHistoryData({
    userId,
    metrics: metricsWithRisk,
    trades: tradesData.trades,
    capitalPools,
  });

  const openRisk = buildTradeTrackerSummary(tradesData.trades).totalOpenRisk;
  const currentState = buildPortfolioCurrentState(
    metricsWithRisk,
    portfolioHistory,
    openRisk,
    capitalPools
  );

  return (
    <PortfolioDashboardClient
      initialMetrics={metricsWithRisk}
      capitalPools={capitalPools}
      portfolioIncome={tickerData.portfolioIncome}
      currentState={currentState}
      openRisk={openRisk}
      dataHealthLines={dataHealthLines}
      recordedTotalAssetsManagedSgd={
        portfolioHistory.latest?.totalAssetsManagedSgd ?? null
      }
    />
  );
}
