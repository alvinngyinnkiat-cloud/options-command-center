import { Badge } from "@/components/ui/Badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/Card";
import type { OpenPositionSummary } from "@/lib/portfolio/types";
import { cn, formatCurrency, formatPercent } from "@/lib/utils";
import type { TradeStatus } from "@/types/database";

interface OpenPositionsSummaryProps {
  positions: OpenPositionSummary[];
}

function statusVariant(status: TradeStatus) {
  switch (status) {
    case "open":
      return "info" as const;
    case "closing":
      return "warning" as const;
    case "closed":
      return "outline" as const;
  }
}

export function OpenPositionsSummary({ positions }: OpenPositionsSummaryProps) {
  const totalPnl = positions.reduce((s, p) => s + p.pnl, 0);

  return (
    <Card variant="default">
      <CardHeader>
        <div className="flex items-center justify-between gap-2">
          <div>
            <CardTitle>Open Positions</CardTitle>
            <CardDescription>
              {positions.length} active spread{positions.length !== 1 ? "s" : ""}
            </CardDescription>
          </div>
          <span
            className={cn(
              "font-mono text-sm font-semibold",
              totalPnl >= 0 ? "text-profit" : "text-loss"
            )}
          >
            {totalPnl >= 0 ? "+" : ""}
            {formatCurrency(totalPnl)} my share
          </span>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-terminal-border text-left text-xs uppercase tracking-wider text-terminal-muted">
                <th className="px-4 py-2.5 font-medium">Symbol</th>
                <th className="px-4 py-2.5 font-medium">Strategy</th>
                <th className="px-4 py-2.5 font-medium">DTE</th>
                <th className="px-4 py-2.5 font-medium text-right">My P/L</th>
                <th className="px-4 py-2.5 font-medium text-right">%</th>
                <th className="px-4 py-2.5 font-medium">Status</th>
              </tr>
            </thead>
            <tbody>
              {positions.map((position) => (
                <tr
                  key={position.id}
                  className="border-b border-terminal-border/50 hover:bg-terminal-elevated/50 transition-colors"
                >
                  <td className="px-4 py-3 font-mono font-semibold text-terminal-text">
                    {position.symbol}
                  </td>
                  <td className="px-4 py-3 text-terminal-muted">
                    {position.strategy}
                  </td>
                  <td className="px-4 py-3 font-mono text-terminal-text">
                    {position.dte}
                  </td>
                  <td
                    className={cn(
                      "px-4 py-3 font-mono text-right",
                      position.pnl >= 0 ? "text-profit" : "text-loss"
                    )}
                  >
                    {formatCurrency(position.pnl)}
                  </td>
                  <td
                    className={cn(
                      "px-4 py-3 font-mono text-right",
                      position.pnlPercent >= 0 ? "text-profit" : "text-loss"
                    )}
                  >
                    {formatPercent(position.pnlPercent)}
                  </td>
                  <td className="px-4 py-3">
                    <Badge variant={statusVariant(position.status)}>
                      {position.status}
                    </Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}
