import { MetricCardsGrid } from "@/components/ui/MetricCardsGrid";
import { StatCard } from "@/components/ui/StatCard";
import type { CapitalPoolsBreakdown } from "@/lib/portfolio/capital-pools";
import type { PortfolioCurrentState } from "@/lib/portfolio/daily-snapshot-types";
import type { PortfolioMetrics } from "@/lib/portfolio/types";
import {
  getPnLChangeType,
  pnlPercentStatProps,
  pnlStatProps,
} from "@/lib/format/pnl";
import { formatSGD } from "@/lib/utils";

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
      : getPnLChangeType(currentState.dailyChange);
  const dailyChangeProps =
    currentState.dailyChange != null
      ? pnlStatProps(currentState.dailyChange, { currency: "SGD" })
      : null;
  const dailyChangePctProps =
    currentState.dailyChangePct != null
      ? pnlPercentStatProps(currentState.dailyChangePct, 2)
      : null;

  return (
    <MetricCardsGrid gap="lg">
      <StatCard
        label="My Portfolio Value"
        value={formatSGD(currentState.portfolioValue)}
        change={
          `Trading ${formatSGD(capitalPools.tradingCapital)} + Crypto ${formatSGD(capitalPools.cryptoPortfolioValueSgd)}`
        }
        changeType="neutral"
      />
      <StatCard
        label="Daily Change"
        value={dailyChangeProps?.value ?? "—"}
        change={
          dailyChangePctProps?.value ?? "From latest daily record"
        }
        valueClassName={dailyChangeProps?.valueClassName}
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
        change="Manual SGD only — USD shown separately"
        changeType="neutral"
      />
      <StatCard
        label="Last Updated"
        value={currentState.lastUpdated ?? "—"}
        change="Latest daily portfolio record"
        changeType="neutral"
      />
    </MetricCardsGrid>
  );
}
