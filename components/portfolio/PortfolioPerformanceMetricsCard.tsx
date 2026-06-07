"use client";

import { StatCard } from "@/components/ui/StatCard";
import type { PortfolioPerformanceMetrics } from "@/lib/portfolio/daily-snapshot-types";
import { formatSignedSGD, formatSGD, formatReturnPercent } from "@/lib/utils";

interface PortfolioPerformanceMetricsCardProps {
  performance: PortfolioPerformanceMetrics;
}

function metricPair(
  label: string,
  value: number | null,
  pct: number | null
) {
  return (
    <StatCard
      label={label}
      value={value != null ? formatSignedSGD(value) : "—"}
      change={pct != null ? formatReturnPercent(pct) : undefined}
      changeType={
        value == null ? "neutral" : value >= 0 ? "positive" : "negative"
      }
    />
  );
}

export function PortfolioPerformanceMetricsCard({
  performance,
}: PortfolioPerformanceMetricsCardProps) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
      {metricPair(
        "Daily Change",
        performance.dailyChange,
        performance.dailyChangePct
      )}
      {metricPair(
        "Weekly Change",
        performance.weeklyChange,
        performance.weeklyChangePct
      )}
      {metricPair(
        "Monthly Change",
        performance.monthlyChange,
        performance.monthlyChangePct
      )}
      {metricPair(
        "Quarterly Change",
        performance.quarterlyChange,
        performance.quarterlyChangePct
      )}
      {metricPair("YTD Change", performance.ytdChange, performance.ytdChangePct)}
      {metricPair(
        "All Time Change",
        performance.allTimeChange,
        performance.allTimeChangePct
      )}
    </div>
  );
}
