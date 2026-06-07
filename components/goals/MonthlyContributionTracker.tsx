import { Badge } from "@/components/ui/Badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/Card";
import type { MonthlyContribution } from "@/lib/goals/types";
import { formatSGD } from "@/lib/goals/format";
import { PiggyBank } from "lucide-react";

interface MonthlyContributionTrackerProps {
  contributions: MonthlyContribution[];
  ytdTotal: number;
  ytdBreakdown: {
    stockOptionsAmountSgd: number;
    cryptoAmountSgd: number;
    stockOptionsPct: number;
    cryptoPct: number;
  };
  currentYear: number;
}

export function MonthlyContributionTracker({
  contributions,
  ytdTotal,
  ytdBreakdown,
  currentYear,
}: MonthlyContributionTrackerProps) {
  const yearContributions = contributions.filter((c) => c.year === currentYear);

  return (
    <Card variant="bordered" className="h-full">
      <CardHeader>
        <div className="flex items-center justify-between gap-2">
          <div>
            <CardTitle>Contributions Summary</CardTitle>
            <CardDescription>
              YTD totals feed portfolio goal projections
            </CardDescription>
          </div>
          <Badge variant="info">YTD {currentYear}</Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-3 text-xs">
          <div className="rounded-md border border-terminal-border p-3">
            <p className="text-[10px] uppercase text-terminal-muted">
              Stocks &amp; Options
            </p>
            <p className="font-mono text-base font-semibold">
              {formatSGD(ytdBreakdown.stockOptionsAmountSgd)}
            </p>
            <p className="text-[10px] text-terminal-muted">
              {ytdBreakdown.stockOptionsPct.toFixed(1)}%
            </p>
          </div>
          <div className="rounded-md border border-terminal-border p-3">
            <p className="text-[10px] uppercase text-terminal-muted">Crypto</p>
            <p className="font-mono text-base font-semibold">
              {formatSGD(ytdBreakdown.cryptoAmountSgd)}
            </p>
            <p className="text-[10px] text-terminal-muted">
              {ytdBreakdown.cryptoPct.toFixed(1)}%
            </p>
          </div>
          <div className="rounded-md border border-terminal-border p-3">
            <p className="text-[10px] uppercase text-terminal-muted">Total</p>
            <p className="font-mono text-base font-semibold">{formatSGD(ytdTotal)}</p>
          </div>
        </div>

        <div className="flex items-center gap-3 rounded-md border border-terminal-border bg-terminal-elevated p-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-md bg-accent/15 border border-accent/20">
            <PiggyBank className="h-4 w-4 text-accent" />
          </div>
          <div>
            <p className="text-[10px] text-terminal-muted">Recent months</p>
            <p className="text-[11px] text-terminal-muted">
              Edit entries in Monthly Contribution Tracker below
            </p>
          </div>
        </div>

        <ul className="space-y-2">
          {yearContributions.slice(-6).map((entry) => (
            <li
              key={entry.id}
              className="flex items-center justify-between gap-2 text-xs border-b border-terminal-border/50 pb-2"
            >
              <span className="text-terminal-muted shrink-0">
                {entry.monthLabel}
              </span>
              <div className="flex flex-wrap items-center justify-end gap-x-3 gap-y-0.5 font-mono text-[11px]">
                <span className="text-terminal-muted">
                  S/O {formatSGD(entry.stockOptionsAmountSgd)}
                </span>
                <span className="text-terminal-muted">
                  C {formatSGD(entry.cryptoAmountSgd)}
                </span>
                <span className="text-terminal-text font-medium">
                  {entry.totalAmountSgd > 0
                    ? formatSGD(entry.totalAmountSgd)
                    : "—"}
                </span>
              </div>
            </li>
          ))}
          {yearContributions.length === 0 && (
            <li className="text-xs text-terminal-muted py-2">
              No contributions recorded for {currentYear}.
            </li>
          )}
        </ul>
      </CardContent>
    </Card>
  );
}
