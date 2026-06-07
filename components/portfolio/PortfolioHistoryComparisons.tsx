"use client";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/Card";
import type { PortfolioHistoryComparison } from "@/lib/portfolio/daily-snapshot-types";
import { cn, formatCurrency, formatPercent } from "@/lib/utils";

interface PortfolioHistoryComparisonsProps {
  comparisons: PortfolioHistoryComparison[];
}

export function PortfolioHistoryComparisons({
  comparisons,
}: PortfolioHistoryComparisonsProps) {
  return (
    <div className="overflow-x-auto rounded-lg border border-terminal-border">
      <table className="w-full min-w-[640px] text-xs">
        <thead>
          <tr className="border-b border-terminal-border bg-terminal-elevated/80 text-left uppercase tracking-wider text-terminal-muted">
            <th className="px-3 py-2.5 font-medium">Period</th>
            <th className="px-3 py-2.5 font-medium text-right">
              Portfolio Value
            </th>
            <th className="px-3 py-2.5 font-medium text-right">Difference</th>
            <th className="px-3 py-2.5 font-medium text-right">Difference %</th>
          </tr>
        </thead>
        <tbody>
          {comparisons.map((row) => (
            <tr
              key={row.label}
              className="border-b border-terminal-border/40"
            >
              <td className="px-3 py-2.5 font-medium text-terminal-text">
                {row.label}
                <span className="ml-2 font-mono text-[10px] text-terminal-muted">
                  {row.referenceDate}
                </span>
              </td>
              <td className="px-3 py-2.5 font-mono text-right text-terminal-text">
                {row.portfolioValue != null
                  ? formatCurrency(row.portfolioValue)
                  : "—"}
              </td>
              <td
                className={cn(
                  "px-3 py-2.5 font-mono text-right",
                  row.difference == null
                    ? "text-terminal-muted"
                    : row.difference >= 0
                      ? "text-profit"
                      : "text-loss"
                )}
              >
                {row.difference != null
                  ? `${row.difference >= 0 ? "+" : ""}${formatCurrency(row.difference)}`
                  : "—"}
              </td>
              <td
                className={cn(
                  "px-3 py-2.5 font-mono text-right",
                  row.differencePct == null
                    ? "text-terminal-muted"
                    : row.differencePct >= 0
                      ? "text-profit"
                      : "text-loss"
                )}
              >
                {row.differencePct != null
                  ? formatPercent(row.differencePct)
                  : "—"}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
