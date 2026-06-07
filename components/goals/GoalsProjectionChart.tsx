"use client";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/Card";
import { SafeChartContainer } from "@/components/ui/SafeChartContainer";
import type { TimelinePoint } from "@/lib/goals/types";
import { formatSGD } from "@/lib/goals/format";
import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

interface GoalsProjectionChartProps {
  timeline: TimelinePoint[];
}

export function GoalsProjectionChart({ timeline }: GoalsProjectionChartProps) {
  const chartData = timeline ?? [];
  const hasData = chartData.length > 0;
  const portfolioTarget = chartData[0]?.portfolioTarget ?? 0;
  const incomeTarget = chartData[0]?.incomeTarget ?? 0;

  return (
    <Card variant="default" className="h-full">
      <CardHeader>
        <CardTitle>Goal Projection Chart</CardTitle>
        <CardDescription>
          Portfolio value and passive income trajectory (SGD)
        </CardDescription>
      </CardHeader>
      <CardContent>
        <SafeChartContainer
          height={288}
          minHeightClass="min-h-[288px]"
          empty={!hasData}
          emptyMessage="No projection data available"
        >
          <ResponsiveContainer width="100%" height={288}>
            <LineChart data={chartData}>
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
                interval={5}
              />
              <YAxis
                yAxisId="portfolio"
                tick={{ fill: "#7a8ba3", fontSize: 10 }}
                axisLine={false}
                tickLine={false}
                tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`}
                width={52}
              />
              <YAxis
                yAxisId="income"
                orientation="right"
                tick={{ fill: "#7a8ba3", fontSize: 10 }}
                axisLine={false}
                tickLine={false}
                tickFormatter={(v) => `$${(v / 1000).toFixed(1)}k`}
                width={48}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: "#0f1419",
                  border: "1px solid #1e2736",
                  borderRadius: "6px",
                  fontSize: "12px",
                }}
                formatter={(value, name) => {
                  const v = Number(value);
                  if (name === "passiveIncome") {
                    return [`${formatSGD(v)}/mo`, "Passive Income"];
                  }
                  return [formatSGD(v), "Portfolio Value"];
                }}
              />
              <Legend
                wrapperStyle={{ fontSize: "11px", color: "#7a8ba3" }}
              />
              <ReferenceLine
                yAxisId="portfolio"
                y={portfolioTarget}
                stroke="#22c55e"
                strokeDasharray="4 4"
                label={{
                  value: "Portfolio goal",
                  fill: "#22c55e",
                  fontSize: 10,
                }}
              />
              <Line
                yAxisId="portfolio"
                type="monotone"
                dataKey="portfolioValue"
                name="Portfolio Value"
                stroke="#3b82f6"
                strokeWidth={2}
                dot={false}
              />
              <Line
                yAxisId="income"
                type="monotone"
                dataKey="passiveIncome"
                name="Passive Income"
                stroke="#f59e0b"
                strokeWidth={2}
                dot={false}
              />
              <ReferenceLine
                yAxisId="income"
                y={incomeTarget}
                stroke="#f59e0b"
                strokeDasharray="4 4"
                label={{
                  value: "Income goal",
                  fill: "#f59e0b",
                  fontSize: 10,
                }}
              />
            </LineChart>
          </ResponsiveContainer>
        </SafeChartContainer>
      </CardContent>
    </Card>
  );
}
