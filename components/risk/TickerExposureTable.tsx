import { Badge } from "@/components/ui/Badge";
import { PnlValue } from "@/components/ui/PnlValue";
import { formatRiskCurrency, formatRiskPct } from "@/lib/risk/format";
import type { TickerExposureRow } from "@/lib/risk/types";
import { cn } from "@/lib/utils";

interface TickerExposureTableProps {
  rows: TickerExposureRow[];
}

export function TickerExposureTable({ rows }: TickerExposureTableProps) {
  if (rows.length === 0) {
    return (
      <p className="text-sm text-terminal-muted py-4">No open ticker exposure.</p>
    );
  }

  return (
    <div className="overflow-x-auto rounded-lg border border-terminal-border">
      <table className="w-full min-w-[900px] text-xs">
        <thead>
          <tr className="border-b border-terminal-border bg-terminal-elevated/80 text-left uppercase tracking-wider text-terminal-muted">
            <th className="px-3 py-2.5 font-medium">Ticker</th>
            <th className="px-3 py-2.5 font-medium">Strategy</th>
            <th className="px-3 py-2.5 font-medium text-right">Max Risk</th>
            <th className="px-3 py-2.5 font-medium text-right">Current P/L</th>
            <th className="px-3 py-2.5 font-medium text-right">Risk %</th>
            <th className="px-3 py-2.5 font-medium">Flags</th>
            <th className="px-3 py-2.5 font-medium">Status</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr
              key={row.tradeId}
              className={cn(
                "border-b border-terminal-border/50 hover:bg-terminal-elevated/30",
                row.isLargest && "bg-accent/5"
              )}
            >
              <td className="px-3 py-2.5 font-mono font-semibold">{row.ticker}</td>
              <td className="px-3 py-2.5">{row.strategy}</td>
              <td className="px-3 py-2.5 font-mono text-right">
                {formatRiskCurrency(row.maxRisk)}
              </td>
              <td className="px-3 py-2.5 font-mono text-right">
                <PnlValue value={row.currentPnl} className="inline" />
              </td>
              <td className="px-3 py-2.5 font-mono text-right text-terminal-muted">
                {formatRiskPct(row.riskPct)}
              </td>
              <td className="px-3 py-2.5">
                <div className="flex flex-wrap gap-1">
                  {row.isDuplicate && (
                    <Badge variant="warning" className="text-[9px]">
                      DUP
                    </Badge>
                  )}
                  {row.isConcentrated && (
                    <Badge variant="danger" className="text-[9px]">
                      CONC
                    </Badge>
                  )}
                  {row.isLargest && (
                    <Badge variant="outline" className="text-[9px]">
                      LARGEST
                    </Badge>
                  )}
                </div>
              </td>
              <td className="px-3 py-2.5 text-terminal-muted">{row.statusLabel}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
