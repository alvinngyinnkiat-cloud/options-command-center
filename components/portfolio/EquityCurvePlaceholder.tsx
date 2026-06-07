"use client";

import { Badge } from "@/components/ui/Badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/Card";
import { SafeChartContainer } from "@/components/ui/SafeChartContainer";
import { MOCK_EQUITY_CURVE } from "@/lib/mock/portfolio";
import { formatCurrency } from "@/lib/utils";
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

export function EquityCurvePlaceholder() {
  const chartData = MOCK_EQUITY_CURVE ?? [];
  const hasData = chartData.length > 0;

  return (
    <Card variant="default" className="h-full">
      <CardHeader>
        <div className="flex items-center justify-between gap-2">
          <div>
            <CardTitle>Equity Curve</CardTitle>
            <CardDescription>
              Portfolio value over time — live data in a future phase
            </CardDescription>
          </div>
          <Badge variant="outline">Placeholder</Badge>
        </div>
      </CardHeader>
      <CardContent>
        <SafeChartContainer
          height={224}
          minHeightClass="min-h-[224px]"
          empty={!hasData}
          emptyMessage="No equity curve data available"
        >
          <ResponsiveContainer width="100%" height={224}>
            <LineChart data={chartData}>
              <CartesianGrid
                strokeDasharray="3 3"
                stroke="#1e2736"
                vertical={false}
              />
              <XAxis
                dataKey="date"
                tick={{ fill: "#7a8ba3", fontSize: 11 }}
                axisLine={{ stroke: "#1e2736" }}
                tickLine={false}
              />
              <YAxis
                tick={{ fill: "#7a8ba3", fontSize: 11 }}
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
                formatter={(value) => [formatCurrency(Number(value)), "Value"]}
              />
              <Line
                type="monotone"
                dataKey="value"
                stroke="#3b82f6"
                strokeWidth={2}
                dot={false}
                activeDot={{ r: 4, fill: "#3b82f6" }}
              />
            </LineChart>
          </ResponsiveContainer>
        </SafeChartContainer>
      </CardContent>
    </Card>
  );
}
