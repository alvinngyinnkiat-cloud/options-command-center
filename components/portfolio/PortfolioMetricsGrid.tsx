import { StatCard } from "@/components/ui/StatCard";
import type { PortfolioMetrics } from "@/lib/portfolio/types";
import {
  formatReturnPercent,
  formatSGD,
  formatSignedSGD,
} from "@/lib/utils";

interface PortfolioMetricsGridProps {
  metrics: PortfolioMetrics;
}

export function PortfolioMetricsGrid({ metrics }: PortfolioMetricsGridProps) {
  const pnlChangeType =
    metrics.netProfitLoss >= 0 ? "positive" : ("negative" as const);
  const monthlyChangeType =
    metrics.monthlyGainLoss >= 0 ? "positive" : ("negative" as const);
  const returnChangeType =
    metrics.returnPercent >= 0 ? "positive" : ("negative" as const);

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
      value: formatSignedSGD(metrics.netProfitLoss),
      change: formatReturnPercent(metrics.returnPercent),
      changeType: pnlChangeType as "positive" | "negative" | "neutral",
    },
    {
      label: "Return %",
      value: formatReturnPercent(metrics.returnPercent),
      change: `Annualized ${formatReturnPercent(metrics.annualizedReturnPercent)}`,
      changeType: returnChangeType as "positive" | "negative" | "neutral",
    },
  ];

  const breakdownMetrics: {
    label: string;
    value: string;
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
      value: formatSignedSGD(metrics.monthlyGainLoss),
      changeType: monthlyChangeType,
    },
    {
      label: "Annualized Return",
      value: formatReturnPercent(metrics.annualizedReturnPercent),
      changeType: returnChangeType,
    },
  ];

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {primaryMetrics.map((stat) => (
          <StatCard
            key={stat.label}
            label={stat.label}
            value={stat.value}
            change={stat.change}
            changeType={stat.changeType}
          />
        ))}
      </div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 xl:grid-cols-8">
        {breakdownMetrics.map((stat) => (
          <StatCard
            key={stat.label}
            label={stat.label}
            value={stat.value}
            changeType={stat.changeType ?? "neutral"}
            className="[&_p:nth-child(2)]:text-lg [&_p:nth-child(2)]:sm:text-xl"
          />
        ))}
      </div>
    </div>
  );
}
