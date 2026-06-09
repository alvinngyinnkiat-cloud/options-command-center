import { MetricCardsGrid } from "@/components/ui/MetricCardsGrid";
import { StatCard } from "@/components/ui/StatCard";
import type { PortfolioMetrics } from "@/lib/portfolio/types";
import {
  pnlPercentStatProps,
  pnlStatProps,
} from "@/lib/format/pnl";
import { formatSGD } from "@/lib/utils";

interface PortfolioMetricsGridProps {
  metrics: PortfolioMetrics;
}

export function PortfolioMetricsGrid({ metrics }: PortfolioMetricsGridProps) {
  const netPnl = pnlStatProps(metrics.netProfitLoss, { currency: "SGD" });
  const returnPct = pnlPercentStatProps(metrics.returnPercent, 2);
  const monthly = pnlStatProps(metrics.monthlyGainLoss, { currency: "SGD" });
  const annualized = pnlPercentStatProps(metrics.annualizedReturnPercent, 2);

  const overrideNote = metrics.comparison.useManualOverride
    ? "Manual reconciliation"
    : `Calc ${formatSGD(metrics.calculated.portfolioValue)}`;

  const primaryMetrics = [
    {
      label: "Portfolio Value",
      value: formatSGD(metrics.portfolioValue),
      change: overrideNote,
      changeType: "neutral" as const,
    },
    {
      label: "Available Risk Capacity",
      value: formatSGD(metrics.availableRiskCapacity),
      change: `${((metrics.availableRiskCapacity / metrics.portfolioValue) * 100).toFixed(0)}% of portfolio`,
      changeType: "neutral" as const,
    },
    {
      label: "Net Profit/Loss",
      value: netPnl.value,
      change: returnPct.value,
      valueClassName: netPnl.valueClassName,
      changeType: netPnl.changeType,
    },
    {
      label: "Return %",
      value: returnPct.value,
      change: `Annualized ${annualized.value}`,
      valueClassName: returnPct.valueClassName,
      changeType: returnPct.changeType,
    },
  ];

  const breakdownMetrics: {
    label: string;
    value: string;
    valueClassName?: string;
    changeType?: "positive" | "negative" | "neutral";
  }[] = [
    { label: "Stocks Value", value: formatSGD(metrics.stocksValue) },
    { label: "ETFs Value", value: formatSGD(metrics.etfsValue) },
    { label: "Crypto Value", value: formatSGD(metrics.cryptoValue) },
    { label: "Cash Value", value: formatSGD(metrics.cashValue) },
    { label: "Total Deposits", value: formatSGD(metrics.totalDeposits) },
    { label: "Total Withdrawals", value: formatSGD(metrics.totalWithdrawals) },
    {
      label: "Monthly Gain/Loss",
      value: monthly.value,
      valueClassName: monthly.valueClassName,
      changeType: monthly.changeType,
    },
    {
      label: "Annualized Return",
      value: annualized.value,
      valueClassName: annualized.valueClassName,
      changeType: annualized.changeType,
    },
  ];

  return (
    <div className="space-y-4">
      <MetricCardsGrid gap="lg">
        {primaryMetrics.map((stat) => (
          <StatCard
            key={stat.label}
            label={stat.label}
            value={stat.value}
            change={stat.change}
            changeType={stat.changeType}
            valueClassName={stat.valueClassName}
          />
        ))}
      </MetricCardsGrid>
      <MetricCardsGrid>
        {breakdownMetrics.map((stat) => (
          <StatCard
            key={stat.label}
            label={stat.label}
            value={stat.value}
            valueClassName={stat.valueClassName}
            changeType={stat.changeType ?? "neutral"}
          />
        ))}
      </MetricCardsGrid>
    </div>
  );
}
