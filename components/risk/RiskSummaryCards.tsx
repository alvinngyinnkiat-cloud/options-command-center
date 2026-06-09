import { MetricCardsGrid } from "@/components/ui/MetricCardsGrid";
import { StatCard } from "@/components/ui/StatCard";
import { formatRiskCurrency, formatRiskPct } from "@/lib/risk/format";
import {
  getPnLChangeType,
  getPnLColor,
  pnlStatProps,
} from "@/lib/format/pnl";
import type { RiskDashboardSummary } from "@/lib/risk/types";

interface RiskSummaryCardsProps {
  summary: RiskDashboardSummary;
}

export function RiskSummaryCards({ summary }: RiskSummaryCardsProps) {
  const myOpenPnl = pnlStatProps(summary.myOpenPnl);
  const zoneType =
    summary.riskZone === "safe"
      ? "positive"
      : summary.riskZone === "caution"
        ? "neutral"
        : "negative";

  return (
    <MetricCardsGrid>
      <StatCard
        label="Trading Capital"
        value={formatRiskCurrency(summary.portfolioValue)}
        change="Excludes crypto & client capital"
        changeType="neutral"
      />
      <StatCard
        label="Current Open Risk"
        value={formatRiskCurrency(summary.currentOpenRisk)}
      />
      <StatCard
        label="My Risk Share"
        value={formatRiskCurrency(summary.myOpenRisk)}
      />
      <StatCard
        label="Client Risk Share"
        value={formatRiskCurrency(summary.clientOpenRisk)}
      />
      <StatCard
        label="My Open P/L"
        value={myOpenPnl.value}
        valueClassName={myOpenPnl.valueClassName}
        changeType={myOpenPnl.changeType}
      />
      <StatCard
        label="Available Risk Capacity"
        value={formatRiskCurrency(summary.availableRiskCapacity)}
        valueClassName={getPnLColor(summary.availableRiskCapacity)}
        changeType={getPnLChangeType(summary.availableRiskCapacity)}
      />
      <StatCard
        label="Options Allocation %"
        value={formatRiskPct(summary.optionsAllocationPct)}
        change={`Max ${formatRiskPct(75, 0)}`}
        changeType={
          summary.optionsAllocationPct > 75 ? "negative" : "neutral"
        }
      />
      <StatCard
        label="Largest Position Risk"
        value={formatRiskCurrency(summary.largestPositionRisk)}
      />
      <StatCard
        label="Portfolio Health Score"
        value={String(summary.portfolioHealthScore)}
        change="/ 100"
      />
      <StatCard
        label="Total Open Trades"
        value={String(summary.totalOpenTrades)}
      />
      <StatCard
        label="Total Buying Power Used"
        value={formatRiskCurrency(summary.totalBuyingPowerUsed)}
        change={formatRiskPct(summary.riskUtilizationPct) + " utilized"}
        changeType={zoneType}
      />
    </MetricCardsGrid>
  );
}
