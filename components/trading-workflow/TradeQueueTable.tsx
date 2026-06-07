import type { TradeQueueItem } from "@/lib/trading-workflow/types";
import { cn } from "@/lib/utils";

interface TradeQueueTableProps {
  items: TradeQueueItem[];
}

function statusClass(status: TradeQueueItem["status"]): string {
  switch (status) {
    case "Ready":
      return "text-gain";
    case "Risk Failed":
    case "Liquidity Failed":
      return "text-loss";
    case "No Trade":
      return "text-terminal-muted";
    default:
      return "text-warn";
  }
}

export function TradeQueueTable({ items }: TradeQueueTableProps) {
  if (items.length === 0) {
    return (
      <p className="text-sm text-terminal-muted py-6 text-center">
        No trade opportunities in queue — run scanner or weekend review first.
      </p>
    );
  }

  return (
    <div className="overflow-x-auto rounded-lg border border-terminal-border">
      <table className="w-full min-w-[800px] text-xs">
        <thead>
          <tr className="border-b border-terminal-border bg-terminal-elevated text-left uppercase tracking-wider text-terminal-muted">
            <th className="px-3 py-2">Rank</th>
            <th className="px-3 py-2">Ticker</th>
            <th className="px-3 py-2">Strategy</th>
            <th className="px-3 py-2 text-right">Score</th>
            <th className="px-3 py-2">Action</th>
            <th className="px-3 py-2">Status</th>
            <th className="px-3 py-2">Reason</th>
            <th className="px-3 py-2">Warning</th>
          </tr>
        </thead>
        <tbody>
          {items.map((item) => (
            <tr
              key={`${item.priorityRank}-${item.ticker}`}
              className="border-b border-terminal-border/40"
            >
              <td className="px-3 py-2 font-mono font-semibold text-accent">
                #{item.priorityRank}
              </td>
              <td className="px-3 py-2 font-mono font-semibold">{item.ticker}</td>
              <td className="px-3 py-2">{item.strategy}</td>
              <td className="px-3 py-2 text-right font-mono">
                {item.combinedScore}
                <span className="text-terminal-muted text-[10px] ml-1">
                  ({item.scannerScore}T)
                </span>
              </td>
              <td className="px-3 py-2">{item.action}</td>
              <td className={cn("px-3 py-2 font-medium", statusClass(item.status))}>
                {item.status}
              </td>
              <td className="px-3 py-2 text-terminal-muted max-w-[200px] truncate" title={item.reason}>
                {item.reason}
              </td>
              <td className="px-3 py-2 text-warn max-w-[160px] truncate" title={item.warning ?? ""}>
                {item.warning ?? "—"}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
