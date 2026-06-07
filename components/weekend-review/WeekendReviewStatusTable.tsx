import type { TickerReviewStatusRow } from "@/lib/weekend-review/types";
import { cn } from "@/lib/utils";

function statusClass(key: TickerReviewStatusRow["statusKey"]): string {
  switch (key) {
    case "updated_this_weekend":
      return "text-profit";
    case "updated_last_week":
      return "text-terminal-muted";
    case "needs_review":
      return "text-loss";
  }
}

interface WeekendReviewStatusTableProps {
  rows: TickerReviewStatusRow[];
  onSelectTicker?: (watchlistId: string) => void;
}

export function WeekendReviewStatusTable({
  rows,
  onSelectTicker,
}: WeekendReviewStatusTableProps) {
  return (
    <div className="overflow-x-auto rounded-lg border border-terminal-border">
      <table className="w-full min-w-[900px] text-xs">
        <thead>
          <tr className="border-b border-terminal-border bg-terminal-elevated/60 text-left uppercase tracking-wider text-terminal-muted">
            <th className="px-3 py-2 font-medium">Ticker</th>
            <th className="px-3 py-2 font-medium">Last Review</th>
            <th className="px-3 py-2 font-medium text-right">S1</th>
            <th className="px-3 py-2 font-medium text-right">S2</th>
            <th className="px-3 py-2 font-medium text-right">R1</th>
            <th className="px-3 py-2 font-medium text-right">R2</th>
            <th className="px-3 py-2 font-medium">Notes</th>
            <th className="px-3 py-2 font-medium">Status</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr
              key={row.watchlistId}
              onClick={() => onSelectTicker?.(row.watchlistId)}
              className={cn(
                "border-b border-terminal-border/40",
                onSelectTicker && "cursor-pointer hover:bg-terminal-elevated/30"
              )}
            >
              <td className="px-3 py-2 font-mono font-semibold text-terminal-text">
                {row.ticker}
              </td>
              <td className="px-3 py-2 text-terminal-muted">{row.lastReviewDate}</td>
              <td className="px-3 py-2 font-mono text-right">{row.support1 ?? "—"}</td>
              <td className="px-3 py-2 font-mono text-right">{row.support2 ?? "—"}</td>
              <td className="px-3 py-2 font-mono text-right">{row.resistance1 ?? "—"}</td>
              <td className="px-3 py-2 font-mono text-right">{row.resistance2 ?? "—"}</td>
              <td className="max-w-[180px] truncate px-3 py-2 text-terminal-muted">
                {row.analystNotes ?? "—"}
              </td>
              <td
                className={cn(
                  "px-3 py-2 font-medium whitespace-nowrap",
                  statusClass(row.statusKey)
                )}
              >
                {row.reviewStatus}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
