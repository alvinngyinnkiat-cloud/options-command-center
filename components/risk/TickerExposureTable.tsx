import { formatSignedCurrency } from "@/lib/trades/format";
import { formatRiskCurrency, formatRiskPct } from "@/lib/risk/format";
import type { TickerExposureRow } from "@/lib/risk/types";
import { cn } from "@/lib/utils";

interface TickerExposureTableProps {
  rows: TickerExposureRow[];
}

function rowHighlight(row: TickerExposureRow): string {
  if (row.isDuplicate) return "bg-loss/10 border-l-2 border-l-loss";
  if (row.isLargest) return "bg-warning/10 border-l-2 border-l-warning";
  if (row.isConcentrated) return "bg-accent/10 border-l-2 border-l-accent";
  return "";
}

function statusClass(row: TickerExposureRow): string {
  if (row.isDuplicate) return "text-loss";
  if (row.isLargest) return "text-warning";
  if (row.isConcentrated) return "text-accent";
  return "text-terminal-muted";
}

export function TickerExposureTable({ rows }: TickerExposureTableProps) {
  return (
    <div className="overflow-x-auto rounded-lg border border-terminal-border">
      <table className="w-full min-w-[700px] text-xs">
        <thead>
          <tr className="border-b border-terminal-border bg-terminal-elevated/60 text-left uppercase tracking-wider text-terminal-muted">
            <th className="px-3 py-2 font-medium">Ticker</th>
            <th className="px-3 py-2 font-medium">Strategy</th>
            <th className="px-3 py-2 font-medium text-right">Max Risk</th>
            <th className="px-3 py-2 font-medium text-right">My P/L</th>
            <th className="px-3 py-2 font-medium">Status</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr
              key={row.tradeId}
              className={cn(
                "border-b border-terminal-border/40 hover:bg-terminal-elevated/30",
                rowHighlight(row)
              )}
            >
              <td className="px-3 py-2 font-mono font-semibold text-terminal-text">
                {row.ticker}
              </td>
              <td className="px-3 py-2 text-terminal-muted">{row.strategy}</td>
              <td className="px-3 py-2 font-mono text-right">
                {formatRiskCurrency(row.maxRisk)}
                <span className="ml-1 text-[10px] text-terminal-muted">
                  ({formatRiskPct(row.riskPct)})
                </span>
              </td>
              <td
                className={cn(
                  "px-3 py-2 font-mono text-right",
                  row.currentPnl >= 0 ? "text-profit" : "text-loss"
                )}
              >
                {formatSignedCurrency(row.currentPnl)}
              </td>
              <td className={cn("px-3 py-2 font-medium", statusClass(row))}>
                {row.statusLabel}
              </td>
            </tr>
          ))}
          {rows.length === 0 && (
            <tr>
              <td
                colSpan={5}
                className="px-3 py-6 text-center text-terminal-muted"
              >
                No open positions
              </td>
            </tr>
          )}
        </tbody>
      </table>
      {rows.some((r) => r.isDuplicate || r.isConcentrated || r.isLargest) && (
        <p className="border-t border-terminal-border px-3 py-2 text-[10px] text-terminal-muted">
          Highlights: red = duplicate ticker · yellow = largest position · blue =
          risk concentration (≥15% of max options capital)
        </p>
      )}
    </div>
  );
}
