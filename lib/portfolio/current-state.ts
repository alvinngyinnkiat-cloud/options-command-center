import type { CapitalPoolsBreakdown } from "@/lib/portfolio/capital-pools";
import type { PortfolioCurrentState } from "@/lib/portfolio/daily-snapshot-types";
import type { PortfolioMetrics } from "@/lib/portfolio/types";

export function buildPortfolioCurrentState(
  metrics: PortfolioMetrics,
  history: { performance: { dailyChange: number | null; dailyChangePct: number | null }; latest: { portfolioValueSgd: number; availableRiskCapacity: number; openRisk: number; snapshotDate: string } | null },
  openRisk: number,
  capitalPools?: CapitalPoolsBreakdown
): PortfolioCurrentState {
  const latest = history.latest;
  const portfolioValue =
    capitalPools?.myPortfolioValue ??
    latest?.portfolioValueSgd ??
    metrics.myPortfolioValue;

  return {
    portfolioValue,
    dailyChange: history.performance.dailyChange,
    dailyChangePct: history.performance.dailyChangePct,
    availableRiskCapacity:
      metrics.availableRiskCapacity ??
      latest?.availableRiskCapacity ??
      0,
    openRisk: latest?.openRisk ?? openRisk,
    cashAvailability:
      capitalPools?.tradingCashSgd ?? metrics.tradingCashSgd ?? metrics.cashValue,
    lastUpdated: latest?.snapshotDate ?? null,
  };
}
