import { formatSignedCurrency } from "@/lib/trades/format";
import { formatRiskCurrency } from "@/lib/risk/format";
import type { ActiveTickerExposureRow } from "@/lib/trading-workflow/types";
import { cn } from "@/lib/utils";

interface ActiveTickerExposureTableProps {
  rows: ActiveTickerExposureRow[];
}

export function ActiveTickerExposureTable({
  rows,
}: ActiveTickerExposureTableProps) {
  return (
    <div className="overflow-x-auto rounded-lg border border-terminal-border">
      <table className="w-full min-w-[800px] text-xs">
        <thead>
          <tr className="border-b border-terminal-border bg-terminal-elevated/60 text-left uppercase tracking-wider text-terminal-muted">
            <th className="px-3 py-2">Ticker</th>
            <th className="px-3 py-2">Active Trade?</th>
            <th className="px-3 py-2">Strategy</th>
            <th className="px-3 py-2">Expiry</th>
            <th className="px-3 py-2 text-right">Max Risk</th>
            <th className="px-3 py-2 text-right">Current P/L</th>
            <th className="px-3 py-2">Status</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr
              key={row.ticker}
              className={cn(
                "border-b border-terminal-border/40",
                row.hasActiveTrade && "bg-warn/5"
              )}
            >
              <td className="px-3 py-2 font-mono font-semibold">{row.ticker}</td>
              <td className="px-3 py-2">
                {row.hasActiveTrade ? (
                  <span className="text-warn font-medium">Yes</span>
                ) : (
                  <span className="text-gain">No</span>
                )}
              </td>
              <td className="px-3 py-2">{row.strategy ?? "—"}</td>
              <td className="px-3 py-2 font-mono">{row.expiry ?? "—"}</td>
              <td className="px-3 py-2 text-right font-mono">
                {row.maxRisk != null ? formatRiskCurrency(row.maxRisk) : "—"}
              </td>
              <td
                className={cn(
                  "px-3 py-2 text-right font-mono",
                  row.currentPnl != null &&
                    (row.currentPnl >= 0 ? "text-profit" : "text-loss")
                )}
              >
                {row.currentPnl != null
                  ? formatSignedCurrency(row.currentPnl)
                  : "—"}
              </td>
              <td className="px-3 py-2">{row.status ?? "—"}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
