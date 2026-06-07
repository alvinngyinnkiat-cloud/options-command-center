import { StatCard } from "@/components/ui/StatCard";
import type { CapitalPoolsBreakdown } from "@/lib/portfolio/capital-pools";
import type { PortfolioCurrentState } from "@/lib/portfolio/daily-snapshot-types";
import type { PortfolioMetrics } from "@/lib/portfolio/types";
import {
  formatReturnPercent,
  formatSGD,
  formatSignedSGD,
} from "@/lib/utils";

interface PortfolioCurrentStateGridProps {
  metrics: PortfolioMetrics;
  currentState: PortfolioCurrentState;
  capitalPools: CapitalPoolsBreakdown;
}

export function PortfolioCurrentStateGrid({
  metrics,
  currentState,
  capitalPools,
}: PortfolioCurrentStateGridProps) {
  const dailyChangeType =
    currentState.dailyChange == null
      ? "neutral"
      : currentState.dailyChange >= 0
        ? "positive"
        : "negative";

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
      <StatCard
        label="My Portfolio Value"
        value={formatSGD(currentState.portfolioValue)}
        change={
          metrics.comparison.useManualOverride
            ? "Manual reconciliation"
            : `Trading ${formatSGD(capitalPools.tradingCapital)} + Crypto ${formatSGD(capitalPools.cryptoCapital)}`
        }
        changeType="neutral"
      />
      <StatCard
        label="Daily Change"
        value={
          currentState.dailyChange != null
            ? formatSignedSGD(currentState.dailyChange)
            : "—"
        }
        change={
          currentState.dailyChangePct != null
            ? formatReturnPercent(currentState.dailyChangePct)
            : "From latest daily record"
        }
        changeType={dailyChangeType}
      />
      <StatCard
        label="Available Risk Capacity"
        value={formatSGD(currentState.availableRiskCapacity)}
        change="Based on Trading Capital × 75%"
        changeType="neutral"
      />
      <StatCard
        label="Open Risk"
        value={formatSGD(currentState.openRisk)}
        change="My portfolio exposure"
        changeType="neutral"
      />
      <StatCard
        label="Trading Cash"
        value={formatSGD(currentState.cashAvailability)}
        change="Broker USD + SGD — not crypto cash"
        changeType="neutral"
      />
      <StatCard
        label="Last Updated"
        value={currentState.lastUpdated ?? "—"}
        change="Latest daily portfolio record"
        changeType="neutral"
      />
    </div>
  );
}
