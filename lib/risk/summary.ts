import { calculateHealthScore } from "@/lib/portfolio/health-score";
import type { CapitalPoolsBreakdown } from "@/lib/portfolio/capital-pools";
import {
  calculateMyPnL,
  calculateRiskShare,
  calculateTotalTradePnL,
} from "@/lib/trades/pnl-allocation";
import type { PortfolioMetrics } from "@/lib/portfolio/types";
import type { EnrichedTrade } from "@/lib/trades/types";
import { STRATEGY_LABELS } from "@/lib/portfolio/types";
import type { StrategyType } from "@/types/database";
import {
  buildRiskFramework,
  calculateOptionsAllocationPct,
  calculatePositionRiskPct,
} from "./calculations";
import { buildCapitalLiquidityBase } from "./capital-liquidity";
import { buildRiskAlerts } from "./alerts";
import { buildTickerExposureRows } from "./ticker-exposure";
import { buildSingleLegRiskChecks } from "./single-leg-checks";
import type {
  LargestRiskPosition,
  OpenRiskByStrategyRow,
  OpenRiskByTickerRow,
  RiskDashboardData,
  RiskDashboardSummary,
  RiskSettingsSnapshot,
} from "./types";

const STRATEGY_KEYS: StrategyType[] = [
  "bull_put_spread",
  "bear_call_spread",
  "iron_condor",
  "sell_put",
  "sell_call",
];

function getOpenTrades(trades: EnrichedTrade[]): EnrichedTrade[] {
  return trades.filter(
    (t) =>
      t.status === "open" ||
      t.status === "managed" ||
      t.status === "closing"
  );
}

export function buildRiskDashboardData(input: {
  portfolio: PortfolioMetrics;
  trades: EnrichedTrade[];
  settings: RiskSettingsSnapshot;
  dataSource: "supabase" | "mock";
  capitalPools?: CapitalPoolsBreakdown;
}): RiskDashboardData {
  const openTrades = getOpenTrades(input.trades);
  const tradingCapital =
    input.capitalPools?.tradingCapital ?? input.portfolio.tradingCapital;
  const tradingCashSgd =
    input.capitalPools?.tradingCashSgd ?? input.portfolio.tradingCashSgd;
  const currentOpenRisk = openTrades.reduce(
    (s, t) => s + t.calculations.maxRisk,
    0
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
  const clientOpenRisk = openTrades.reduce((s, t) => {
    const share = calculateRiskShare(
      t.calculations.maxRisk,
      t.tradeOwnership,
      t.myProfitSharePercent,
      t.clientProfitSharePercent
    );
    return s + share.clientRisk;
  }, 0);
  const myOpenPnl = openTrades.reduce(
    (s, t) =>
      s + calculateMyPnL(t, calculateTotalTradePnL(t)),
    0
  );
  const totalBuyingPowerUsed = openTrades.reduce(
    (s, t) => s + t.calculations.buyingPowerUsed,
    0
  );

  const framework = buildRiskFramework({
    portfolioValue: tradingCapital,
    currentOpenRisk: myOpenRisk,
    maxAllocationPct: input.settings.maxOptionsAllocationPercent,
    maxRiskPerTradePct: input.settings.maxRiskPerTradePercent,
  });

  const optionsAllocationPct = calculateOptionsAllocationPct(
    totalBuyingPowerUsed,
    tradingCapital
  );

  const largestPositionRisk = openTrades.reduce(
    (max, t) => Math.max(max, t.calculations.maxRisk),
    0
  );

  const healthScore = calculateHealthScore({
    portfolioValue: tradingCapital,
    availableRiskCapacity: framework.availableRiskCapacity,
    optionsAllocationPct,
    openPositionsCount: openTrades.length,
    expiringThisWeek: openTrades.filter(
      (t) => t.calculations.dte <= 7
    ).length,
    returnPercent: input.portfolio.returnPercent,
  });

  const summary: RiskDashboardSummary = {
    portfolioValue: tradingCapital,
    currentOpenRisk,
    myOpenRisk,
    clientOpenRisk,
    myOpenPnl,
    availableRiskCapacity: framework.availableRiskCapacity,
    optionsAllocationPct,
    largestPositionRisk,
    portfolioHealthScore: healthScore.score,
    totalOpenTrades: openTrades.length,
    totalBuyingPowerUsed,
    maximumOptionsCapital: framework.maximumOptionsCapital,
    maximumRiskPerTrade: framework.maximumRiskPerTrade,
    riskUtilizationPct: framework.riskUtilizationPct,
    riskZone: framework.riskZone,
  };

  const openRiskByTicker: OpenRiskByTickerRow[] = openTrades.map((t) => ({
    tradeId: t.id,
    ticker: t.ticker,
    strategy: t.strategyLabel,
    contracts: t.contracts,
    maxRisk: t.calculations.maxRisk,
    currentPnl: t.calculations.currentPnl,
    myCurrentPnl: t.pnlAllocation.myPnl,
    riskPct: calculatePositionRiskPct(
      t.calculations.maxRisk,
      framework.maximumOptionsCapital
    ),
  }));

  const openRiskByStrategy: OpenRiskByStrategyRow[] = STRATEGY_KEYS.map(
    (key) => {
      const strategyTrades = openTrades.filter((t) => t.strategy === key);
      const totalMaxRisk = strategyTrades.reduce(
        (s, t) => s + t.calculations.maxRisk,
        0
      );
      const totalCurrentPnl = strategyTrades.reduce(
        (s, t) => s + t.pnlAllocation.myPnl,
        0
      );
      return {
        strategy: STRATEGY_LABELS[key],
        strategyKey: key,
        openTrades: strategyTrades.length,
        totalMaxRisk,
        totalCurrentPnl,
        riskPct: calculatePositionRiskPct(
          totalMaxRisk,
          framework.maximumOptionsCapital
        ),
      };
    }
  );

  const largestRiskPositions: LargestRiskPosition[] = [...openTrades]
    .sort((a, b) => b.calculations.maxRisk - a.calculations.maxRisk)
    .slice(0, 5)
    .map((t) => ({
      tradeId: t.id,
      ticker: t.ticker,
      strategy: t.strategyLabel,
      maxRisk: t.calculations.maxRisk,
      riskPct: calculatePositionRiskPct(
        t.calculations.maxRisk,
        framework.maximumOptionsCapital
      ),
      currentPnl: t.pnlAllocation.myPnl,
    }));

  const tickerExposure = buildTickerExposureRows(
    openTrades,
    framework.maximumOptionsCapital
  );

  const capitalLiquidity = buildCapitalLiquidityBase({
    portfolioValue: input.portfolio.myPortfolioValue,
    tradingCapital,
    tradingCashSgd,
    tradingCashUsd: input.capitalPools?.cash.brokerUsdCashNative,
    usStocksOptionsValueUsd: input.portfolio.usStocksOptionsValueUsd,
    stocksValue: input.portfolio.stocksValue,
    etfsValue: input.portfolio.etfsValue,
    cryptoValue: input.portfolio.cryptoValue,
    cryptoCashSgd: input.capitalPools?.cryptoCashSgd ?? input.portfolio.cryptoCashSgd,
    holdings: input.portfolio.holdings,
    openTrades,
    maxAllocationPct: input.settings.maxOptionsAllocationPercent,
    maxRiskPerTradePct: input.settings.maxRiskPerTradePercent,
  });

  const alerts = buildRiskAlerts(
    summary,
    openTrades,
    tickerExposure,
    capitalLiquidity.cash.cashUsdNative
  );

  const singleLegChecks = buildSingleLegRiskChecks(
    openTrades,
    capitalLiquidity.cash.cashUsdNative
  );

  return {
    summary,
    healthScore,
    settings: input.settings,
    capitalLiquidity,
    openRiskByTicker,
    openRiskByStrategy,
    largestRiskPositions,
    tickerExposure,
    alerts,
    singleLegChecks,
    openTrades,
    dataSource: input.dataSource,
  };
}
