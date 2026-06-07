import type { WeeklyMarketUpdateRecord } from "@/lib/weekend-review/types";

interface WeekendReviewHistoryTableProps {
  history: WeeklyMarketUpdateRecord[];
}

export function WeekendReviewHistoryTable({
  history,
}: WeekendReviewHistoryTableProps) {
  if (history.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-terminal-border p-6 text-center text-sm text-terminal-muted">
        No review history yet. Run Weekend Market Review to save snapshots.
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-lg border border-terminal-border">
      <table className="w-full min-w-[1100px] text-xs">
        <thead>
          <tr className="border-b border-terminal-border bg-terminal-elevated/60 text-left uppercase tracking-wider text-terminal-muted">
            <th className="px-3 py-2 font-medium">Review Date</th>
            <th className="px-3 py-2 font-medium">Ticker</th>
            <th className="px-3 py-2 font-medium text-right">S1</th>
            <th className="px-3 py-2 font-medium text-right">S2</th>
            <th className="px-3 py-2 font-medium text-right">R1</th>
            <th className="px-3 py-2 font-medium text-right">R2</th>
            <th className="px-3 py-2 font-medium">Notes</th>
            <th className="px-3 py-2 font-medium">Strategy</th>
            <th className="px-3 py-2 font-medium text-right">Score</th>
            <th className="px-3 py-2 font-medium">Action</th>
          </tr>
        </thead>
        <tbody>
          {history.map((row) => (
            <tr
              key={row.id}
              className="border-b border-terminal-border/40 hover:bg-terminal-elevated/30"
            >
              <td className="px-3 py-2 text-terminal-muted">{row.reviewDate}</td>
              <td className="px-3 py-2 font-mono font-semibold">{row.ticker}</td>
              <td className="px-3 py-2 font-mono text-right">{row.support1 ?? "—"}</td>
              <td className="px-3 py-2 font-mono text-right">{row.support2 ?? "—"}</td>
              <td className="px-3 py-2 font-mono text-right">{row.resistance1 ?? "—"}</td>
              <td className="px-3 py-2 font-mono text-right">{row.resistance2 ?? "—"}</td>
              <td className="max-w-[140px] truncate px-3 py-2 text-terminal-muted">
                {row.analystNotes ?? "—"}
              </td>
              <td className="px-3 py-2 text-terminal-muted">
                {row.recommendedStrategy ?? "—"}
              </td>
              <td className="px-3 py-2 font-mono text-right">
                {row.totalScore != null ? row.totalScore.toFixed(0) : "—"}
              </td>
              <td className="px-3 py-2 text-terminal-muted">{row.action ?? "—"}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
