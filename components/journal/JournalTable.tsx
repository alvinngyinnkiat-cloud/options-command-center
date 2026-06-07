"use client";

import { Badge } from "@/components/ui/Badge";
import { formatSignedCurrency } from "@/lib/journal/format";
import type { EnrichedJournalEntry } from "@/lib/journal/types";
import { cn } from "@/lib/utils";

interface JournalTableProps {
  entries: EnrichedJournalEntry[];
  onSelect: (entry: EnrichedJournalEntry) => void;
}

function winVariant(winLoss: EnrichedJournalEntry["winLoss"]) {
  if (winLoss === "Win") return "success" as const;
  if (winLoss === "Loss") return "danger" as const;
  return "outline" as const;
}

export function JournalTable({ entries, onSelect }: JournalTableProps) {
  if (entries.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-terminal-border p-8 text-center text-sm text-terminal-muted">
        No journal entries yet. Create one to document your trade reasoning and outcomes.
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-lg border border-terminal-border">
      <table className="w-full min-w-[960px] text-xs">
        <thead>
          <tr className="border-b border-terminal-border bg-terminal-elevated/80 text-left uppercase tracking-wider text-terminal-muted">
            <th className="px-3 py-2.5 font-medium">Date</th>
            <th className="px-3 py-2.5 font-medium">Ticker</th>
            <th className="px-3 py-2.5 font-medium">Strategy</th>
            <th className="px-3 py-2.5 font-medium">Entry Reason</th>
            <th className="px-3 py-2.5 font-medium">Exit Reason</th>
            <th className="px-3 py-2.5 font-medium text-right">P/L</th>
            <th className="px-3 py-2.5 font-medium">Win/Loss</th>
            <th className="px-3 py-2.5 font-medium">Lesson Learned</th>
          </tr>
        </thead>
        <tbody>
          {entries.map((entry) => (
            <tr
              key={entry.id}
              onClick={() => onSelect(entry)}
              className="border-b border-terminal-border/50 cursor-pointer transition-colors hover:bg-terminal-elevated/40"
            >
              <td className="px-3 py-2.5 font-mono text-terminal-text">
                {entry.entryDate}
              </td>
              <td className="px-3 py-2.5 font-mono font-semibold text-terminal-text">
                {entry.ticker}
              </td>
              <td className="px-3 py-2.5 text-terminal-muted">
                {entry.strategyLabel}
              </td>
              <td className="max-w-[180px] truncate px-3 py-2.5 text-terminal-muted">
                {entry.reasonForEntry ?? "—"}
              </td>
              <td className="px-3 py-2.5 text-terminal-muted">
                {entry.exitReason ?? (entry.isClosed ? "—" : "Open")}
              </td>
              <td
                className={cn(
                  "px-3 py-2.5 text-right font-mono",
                  entry.profitLoss != null && entry.profitLoss >= 0
                    ? "text-profit"
                    : entry.profitLoss != null
                      ? "text-loss"
                      : "text-terminal-muted"
                )}
              >
                {entry.profitLoss != null
                  ? formatSignedCurrency(entry.profitLoss)
                  : "—"}
              </td>
              <td className="px-3 py-2.5">
                {entry.winLoss ? (
                  <Badge variant={winVariant(entry.winLoss)}>{entry.winLoss}</Badge>
                ) : (
                  <Badge variant="outline">Open</Badge>
                )}
              </td>
              <td className="max-w-[200px] truncate px-3 py-2.5 text-terminal-muted">
                {entry.lessonLearned ?? "—"}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
