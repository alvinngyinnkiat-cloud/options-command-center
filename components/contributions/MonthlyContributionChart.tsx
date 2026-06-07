"use client";

import { useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { SafeChartContainer } from "@/components/ui/SafeChartContainer";
import {
  buildContributionChartData,
  type ContributionChartPeriod,
} from "@/lib/contributions/calculations";
import type { MonthlyContributionRecord } from "@/lib/contributions/types";
import { cn } from "@/lib/utils";
import { formatSGD } from "@/lib/utils";
import {
  Bar,
  CartesianGrid,
  ComposedChart,
  Legend,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

interface MonthlyContributionChartProps {
  contributions: MonthlyContributionRecord[];
  currentYear: number;
}

const PERIODS: { id: ContributionChartPeriod; label: string }[] = [
  { id: "monthly", label: "Monthly" },
  { id: "quarterly", label: "Quarterly" },
  { id: "yearly", label: "Yearly" },
];

export function MonthlyContributionChart({
  contributions,
  currentYear,
}: MonthlyContributionChartProps) {
  const [period, setPeriod] = useState<ContributionChartPeriod>("monthly");

  const chartData = buildContributionChartData(
    contributions,
    period,
    currentYear
  );

  const hasData = chartData.some(
    (d) => d.stockOptions > 0 || d.crypto > 0 || d.total > 0
  );

  return (
    <Card variant="bordered">
      <CardHeader>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <CardTitle>Contribution Charts</CardTitle>
            <CardDescription>
              Total, Stocks &amp; Options, and Crypto — SGD
            </CardDescription>
          </div>
          <div className="flex flex-wrap gap-1">
            {PERIODS.map(({ id, label }) => (
              <Button
                key={id}
                variant={period === id ? "secondary" : "ghost"}
                size="sm"
                className={cn("h-7 text-[11px]", period === id && "font-medium")}
                onClick={() => setPeriod(id)}
              >
                {label}
              </Button>
            ))}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <SafeChartContainer
          height={280}
          minHeightClass="min-h-[280px]"
          empty={!hasData}
          emptyMessage="No contribution data for this period"
        >
          <ResponsiveContainer width="100%" height={280}>
            <ComposedChart data={chartData}>
              <CartesianGrid
                strokeDasharray="3 3"
                stroke="#1e2736"
                vertical={false}
              />
              <XAxis
                dataKey="label"
                tick={{ fill: "#7a8ba3", fontSize: 10 }}
                axisLine={{ stroke: "#1e2736" }}
                tickLine={false}
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
                  background: "#0f1419",
                  border: "1px solid #1e2736",
                  borderRadius: 6,
                  fontSize: 11,
                }}
                formatter={(value) => [
                  formatSGD(Number(value ?? 0)),
                  undefined,
                ]}
              />
              <Legend wrapperStyle={{ fontSize: 11, color: "#7a8ba3" }} />
              <Bar
                dataKey="stockOptions"
                name="Stocks & Options"
                fill="#3b82f6"
                radius={[2, 2, 0, 0]}
                barSize={period === "monthly" ? 16 : 24}
              />
              <Bar
                dataKey="crypto"
                name="Crypto"
                fill="#f59e0b"
                radius={[2, 2, 0, 0]}
                barSize={period === "monthly" ? 16 : 24}
              />
              <Line
                type="monotone"
                dataKey="total"
                name="Total"
                stroke="#22c55e"
                strokeWidth={2}
                dot={{ r: 3, fill: "#22c55e" }}
              />
            </ComposedChart>
          </ResponsiveContainer>
        </SafeChartContainer>
      </CardContent>
    </Card>
  );
}
