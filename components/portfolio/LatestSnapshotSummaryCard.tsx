import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/Card";
import type { PortfolioSnapshotSummary } from "@/lib/portfolio/types";
import { cn, formatCurrency, formatPercent } from "@/lib/utils";

interface LatestSnapshotSummaryCardProps {
  /** Latest recorded row from daily_portfolio_snapshots (mapped for display). */
  latestSnapshot: PortfolioSnapshotSummary | null;
}

export function LatestSnapshotSummaryCard({
  latestSnapshot: latest,
}: LatestSnapshotSummaryCardProps) {
  if (!latest) return null;

  return (
    <div>
      <h2 className="mb-3 text-xs font-medium uppercase tracking-wider text-terminal-muted">
        Latest Snapshot Summary
      </h2>
      <Card variant="elevated" className="max-w-md">
        <CardHeader className="py-3">
          <CardTitle className="text-xs font-mono">
            {latest.snapshotDate}
          </CardTitle>
          <CardDescription>
            Most recent recorded daily snapshot
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-2 pb-4">
          <div>
            <p className="text-[10px] uppercase tracking-wider text-terminal-muted">
              Portfolio Value
            </p>
            <p className="font-mono text-lg font-semibold text-terminal-text">
              {formatCurrency(latest.portfolioValue)}
            </p>
          </div>
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div>
              <p className="text-terminal-muted">MTD P&amp;L</p>
              <p
                className={cn(
                  "font-mono font-medium",
                  latest.mtdPnl >= 0 ? "text-profit" : "text-loss"
                )}
              >
                {latest.mtdPnl >= 0 ? "+" : ""}
                {formatCurrency(latest.mtdPnl)}
              </p>
            </div>
            <div>
              <p className="text-terminal-muted">MTD %</p>
              <p
                className={cn(
                  "font-mono font-medium",
                  latest.mtdPnlPct >= 0 ? "text-profit" : "text-loss"
                )}
              >
                {formatPercent(latest.mtdPnlPct)}
              </p>
            </div>
            <div>
              <p className="text-terminal-muted">Risk Cap.</p>
              <p className="font-mono text-terminal-text">
                {formatCurrency(latest.availableRiskCapacity)}
              </p>
            </div>
            <div>
              <p className="text-terminal-muted">Positions</p>
              <p className="font-mono text-terminal-text">
                {latest.openPositionsCount}
              </p>
            </div>
          </div>
          {latest.healthScore != null && (
            <p className="border-t border-terminal-border pt-1 text-[11px] text-terminal-muted">
              Health score:{" "}
              <span className="font-mono text-accent">{latest.healthScore}</span>
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
