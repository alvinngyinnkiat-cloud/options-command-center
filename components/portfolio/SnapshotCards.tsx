import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/Card";
import type { PortfolioSnapshotSummary } from "@/lib/portfolio/types";
import { cn, formatCurrency, formatPercent } from "@/lib/utils";

interface SnapshotCardsProps {
  snapshots: PortfolioSnapshotSummary[];
}

export function SnapshotCards({ snapshots }: SnapshotCardsProps) {
  return (
    <div>
      <h2 className="mb-3 text-xs font-medium uppercase tracking-wider text-terminal-muted">
        Portfolio Snapshots
      </h2>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {snapshots.map((snap, index) => (
          <Card
            key={snap.id}
            variant={index === 0 ? "elevated" : "default"}
          >
            <CardHeader className="py-3">
              <CardTitle className="text-xs font-mono">
                {snap.snapshotDate}
              </CardTitle>
              <CardDescription>
                {index === 0 ? "Latest snapshot" : "Historical"}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-2 pb-4">
              <div>
                <p className="text-[10px] uppercase tracking-wider text-terminal-muted">
                  Portfolio Value
                </p>
                <p className="font-mono text-lg font-semibold text-terminal-text">
                  {formatCurrency(snap.portfolioValue)}
                </p>
              </div>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div>
                  <p className="text-terminal-muted">MTD P&L</p>
                  <p
                    className={cn(
                      "font-mono font-medium",
                      snap.mtdPnl >= 0 ? "text-profit" : "text-loss"
                    )}
                  >
                    {snap.mtdPnl >= 0 ? "+" : ""}
                    {formatCurrency(snap.mtdPnl)}
                  </p>
                </div>
                <div>
                  <p className="text-terminal-muted">MTD %</p>
                  <p
                    className={cn(
                      "font-mono font-medium",
                      snap.mtdPnlPct >= 0 ? "text-profit" : "text-loss"
                    )}
                  >
                    {formatPercent(snap.mtdPnlPct)}
                  </p>
                </div>
                <div>
                  <p className="text-terminal-muted">Risk Cap.</p>
                  <p className="font-mono text-terminal-text">
                    {formatCurrency(snap.availableRiskCapacity)}
                  </p>
                </div>
                <div>
                  <p className="text-terminal-muted">Positions</p>
                  <p className="font-mono text-terminal-text">
                    {snap.openPositionsCount}
                  </p>
                </div>
              </div>
              {snap.healthScore != null && (
                <p className="text-[11px] text-terminal-muted pt-1 border-t border-terminal-border">
                  Health score:{" "}
                  <span className="font-mono text-accent">
                    {snap.healthScore}
                  </span>
                </p>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
