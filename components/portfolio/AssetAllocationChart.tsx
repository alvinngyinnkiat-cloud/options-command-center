"use client";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/Card";
import { SafeChartContainer } from "@/components/ui/SafeChartContainer";
import type { AssetAllocationSlice } from "@/lib/portfolio/types";
import { formatCurrency } from "@/lib/utils";
import {
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
} from "recharts";

interface AssetAllocationChartProps {
  data: AssetAllocationSlice[];
}

export function AssetAllocationChart({ data }: AssetAllocationChartProps) {
  const chartData = data?.filter((slice) => slice.value > 0) ?? [];
  const hasData = chartData.length > 0;

  return (
    <Card variant="default" className="h-full">
      <CardHeader>
        <CardTitle>Asset Allocation</CardTitle>
        <CardDescription>Portfolio breakdown by asset class</CardDescription>
      </CardHeader>
      <CardContent>
        <SafeChartContainer
          height={256}
          minHeightClass="min-h-[256px]"
          empty={!hasData}
          emptyMessage="No allocation data to display"
        >
          <ResponsiveContainer width="100%" height={256}>
            <PieChart>
              <Pie
                data={chartData}
                cx="50%"
                cy="50%"
                innerRadius={55}
                outerRadius={90}
                paddingAngle={2}
                dataKey="value"
                nameKey="name"
                stroke="none"
              >
                {chartData.map((entry) => (
                  <Cell key={entry.name} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{
                  backgroundColor: "#0f1419",
                  border: "1px solid #1e2736",
                  borderRadius: "6px",
                  fontSize: "12px",
                }}
                formatter={(value, name) => [
                  formatCurrency(Number(value)),
                  String(name),
                ]}
              />
            </PieChart>
          </ResponsiveContainer>
        </SafeChartContainer>
        <ul className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-3">
          {chartData.map((slice) => (
            <li key={slice.name} className="flex items-center gap-2 text-xs">
              <span
                className="h-2.5 w-2.5 shrink-0 rounded-full"
                style={{ backgroundColor: slice.color }}
              />
              <span className="text-terminal-muted">{slice.name}</span>
              <span className="ml-auto font-mono text-terminal-text">
                {slice.percent.toFixed(1)}%
              </span>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}
