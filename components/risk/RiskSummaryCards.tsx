import { StatCard } from "@/components/ui/StatCard";
import { formatRiskCurrency, formatRiskPct } from "@/lib/risk/format";
import { formatSignedCurrency } from "@/lib/trades/format";
import type { RiskDashboardSummary } from "@/lib/risk/types";

interface RiskSummaryCardsProps {
  summary: RiskDashboardSummary;
}

export function RiskSummaryCards({ summary }: RiskSummaryCardsProps) {
  const zoneType =
    summary.riskZone === "safe"
      ? "positive"
      : summary.riskZone === "caution"
        ? "neutral"
        : "negative";

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-10">
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
        value={formatSignedCurrency(summary.myOpenPnl)}
        changeType={summary.myOpenPnl >= 0 ? "positive" : "negative"}
      />
      <StatCard
        label="Available Risk Capacity"
        value={formatRiskCurrency(summary.availableRiskCapacity)}
        changeType={summary.availableRiskCapacity > 0 ? "positive" : "negative"}
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
    </div>
  );
}
