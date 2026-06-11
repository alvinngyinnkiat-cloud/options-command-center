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
import { formatSingaporeTimestamp } from "@/lib/time/singapore-time";
import { formatCurrency, formatSGD } from "@/lib/utils";
import { format, parseISO } from "date-fns";
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

function formatChartDateLabel(date: string, period: PortfolioHistoryPeriod): string {
  const parsed = parseISO(date);
  if (period === "7D" || period === "30D") {
    return format(parsed, "d MMM");
  }
  if (period === "90D" || period === "YTD") {
    return format(parsed, "d MMM");
  }
  return format(parsed, "MMM yy");
}

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

  const showDailyDots = chartData.length > 0 && chartData.length <= 90;

  return (
    <Card variant="default" className="h-full">
      <CardHeader>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <CardTitle>Portfolio Performance</CardTitle>
            <CardDescription>
              Daily My Portfolio Value from automated snapshots — one point per
              Singapore calendar day
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
          emptyMessage="No daily snapshot history yet — snapshots are recorded automatically at 11:59 PM SGT"
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
                minTickGap={period === "7D" ? 16 : 32}
                tickFormatter={(value) =>
                  formatChartDateLabel(String(value), period)
                }
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
                labelFormatter={(label) => {
                  const point = chartData.find((d) => d.date === label);
                  const timeLabel = point?.recordedAt
                    ? formatSingaporeTimestamp(point.recordedAt)
                    : null;
                  return timeLabel
                    ? `${label} · ${timeLabel} SGT`
                    : String(label);
                }}
                formatter={(value, _name, item) => {
                  const point = item.payload as (typeof chartData)[number];
                  return [
                    <span key="value" className="block space-y-0.5">
                      <span className="block">
                        {formatCurrency(Number(value))} My Portfolio Value
                      </span>
                      {point.pnl !== 0 || point.returnPct !== 0 ? (
                        <span className="block text-[10px] text-terminal-muted">
                          P/L {formatSGD(point.pnl)} · Return{" "}
                          {point.returnPct.toFixed(1)}%
                        </span>
                      ) : null}
                    </span>,
                    "",
                  ];
                }}
              />
              <Line
                type="monotone"
                dataKey="value"
                stroke="#3b82f6"
                strokeWidth={2}
                dot={showDailyDots ? { r: 2, fill: "#3b82f6" } : false}
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
            in range · My Portfolio Value only · recorded 11:59 PM SGT
          </p>
        )}
      </CardContent>
    </Card>
  );
}
