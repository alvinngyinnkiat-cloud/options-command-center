"use client";

import { useMemo, useState } from "react";
import { Button } from "@/components/ui/Button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/Card";
import { SafeChartContainer } from "@/components/ui/SafeChartContainer";
import type {
  DailyPortfolioSnapshot,
  PortfolioHistoryPeriod,
} from "@/lib/portfolio/daily-snapshot-types";
import {
  filterSnapshotsByPeriod,
  toChartSeries,
} from "@/lib/portfolio/snapshot-history";
import {
  DEFAULT_PORTFOLIO_CHART_PERIOD,
  loadPortfolioChartPeriod,
  savePortfolioChartPeriod,
} from "@/lib/portfolio/history-preferences";
import { MOCK_REFERENCE_DATE } from "@/lib/mock/reference-dates";
import { formatCurrency } from "@/lib/utils";
import {
  CartesianGrid,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

const PERIODS: PortfolioHistoryPeriod[] = [
  "7D",
  "30D",
  "90D",
  "YTD",
  "1Y",
  "ALL",
];

interface PortfolioGrowthChartProps {
  snapshots: DailyPortfolioSnapshot[];
  asOfDate?: string;
  /** Optional horizontal target line (e.g. SGD 100,000 goal) */
  targetValue?: number | null;
  targetLabel?: string;
}

export function PortfolioGrowthChart({
  snapshots,
  asOfDate = MOCK_REFERENCE_DATE,
  targetValue,
  targetLabel = "Target",
}: PortfolioGrowthChartProps) {
  const [period, setPeriod] = useState<PortfolioHistoryPeriod>(() =>
    typeof window !== "undefined"
      ? loadPortfolioChartPeriod()
      : DEFAULT_PORTFOLIO_CHART_PERIOD
  );

  function handlePeriodChange(next: PortfolioHistoryPeriod) {
    setPeriod(next);
    savePortfolioChartPeriod(next);
  }

  const chartData = useMemo(() => {
    const filtered = filterSnapshotsByPeriod(snapshots, period, asOfDate);
    return toChartSeries(filtered);
  }, [snapshots, period, asOfDate]);

  return (
    <Card variant="default" className="h-full">
      <CardHeader>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <CardTitle>Portfolio Value Over Time</CardTitle>
            <CardDescription>
              My Portfolio Value over time — SGD, client capital excluded
            </CardDescription>
          </div>
          <div className="flex flex-wrap gap-1">
            {PERIODS.map((p) => (
              <Button
                key={p}
                variant={period === p ? "secondary" : "ghost"}
                size="sm"
                className="h-7 px-2 text-[10px]"
                onClick={() => handlePeriodChange(p)}
              >
                {p}
              </Button>
            ))}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <SafeChartContainer
          height={256}
          minHeightClass="min-h-[256px]"
          empty={chartData.length === 0}
          emptyMessage="No snapshot history yet"
        >
          <ResponsiveContainer width="100%" height={256}>
            <LineChart data={chartData}>
              <CartesianGrid
                strokeDasharray="3 3"
                stroke="#1e2736"
                vertical={false}
              />
              <XAxis
                dataKey="date"
                tick={{ fill: "#7a8ba3", fontSize: 10 }}
                axisLine={{ stroke: "#1e2736" }}
                tickLine={false}
                minTickGap={32}
              />
              <YAxis
                tick={{ fill: "#7a8ba3", fontSize: 10 }}
                axisLine={false}
                tickLine={false}
                tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`}
                width={48}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: "#0f1419",
                  border: "1px solid #1e2736",
                  borderRadius: "6px",
                  fontSize: "12px",
                }}
                formatter={(value) => [
                  formatCurrency(Number(value)),
                  "My Portfolio Value",
                ]}
              />
              <Line
                type="monotone"
                dataKey="value"
                stroke="#3b82f6"
                strokeWidth={2}
                dot={false}
                activeDot={{ r: 4, fill: "#3b82f6" }}
              />
              {targetValue != null && targetValue > 0 && (
                <ReferenceLine
                  y={targetValue}
                  stroke="#22c55e"
                  strokeDasharray="6 4"
                  label={{
                    value: `${targetLabel} ${formatCurrency(targetValue)}`,
                    fill: "#22c55e",
                    fontSize: 10,
                    position: "insideTopRight",
                  }}
                />
              )}
            </LineChart>
          </ResponsiveContainer>
        </SafeChartContainer>
        {chartData.length > 0 && (
          <p className="mt-2 text-[10px] text-terminal-muted">
            {chartData.length} daily snapshot{chartData.length !== 1 ? "s" : ""}{" "}
            in range · My Portfolio Value only
          </p>
        )}
      </CardContent>
    </Card>
  );
}
