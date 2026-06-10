"use client";

import type { TradeQueueItem } from "@/lib/trading-workflow/types";
import { formatScore } from "@/lib/watchlist/format";

interface TradeQueueTableProps {
  items: TradeQueueItem[];
}

export function TradeQueueTable({ items }: TradeQueueTableProps) {
  if (items.length === 0) {
    return (
      <p className="text-sm text-terminal-muted py-6 text-center">
        No trade opportunities in queue — refresh watchlist scanner first.
      </p>
    );
  }

  return (
    <div className="overflow-x-auto rounded-lg border border-terminal-border">
      <table className="w-full min-w-[960px] text-xs">
        <thead>
          <tr className="border-b border-terminal-border bg-terminal-elevated text-left uppercase tracking-wider text-terminal-muted">
            <th className="px-3 py-2">Rank</th>
            <th className="px-3 py-2">Ticker</th>
            <th className="px-3 py-2">Category</th>
            <th className="px-3 py-2">Main Decision</th>
            <th className="px-3 py-2 text-right">Strategy Fit</th>
            <th className="px-3 py-2">20 EMA Decision</th>
            <th className="px-3 py-2 text-right">EMA Score</th>
            <th className="px-3 py-2">Confluence</th>
            <th className="px-3 py-2">Reason</th>
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
              <td className="px-3 py-2">{item.category}</td>
              <td className="px-3 py-2">{item.mainDecision}</td>
              <td className="px-3 py-2 text-right font-mono">
                {formatScore(item.strategyFitScore)}
              </td>
              <td className="px-3 py-2">{item.emaDecision}</td>
              <td className="px-3 py-2 text-right font-mono">
                {formatScore(item.emaScore)}
              </td>
              <td className="px-3 py-2">{item.confluenceStatus}</td>
              <td className="px-3 py-2 text-terminal-muted max-w-[280px] whitespace-normal">
                {item.reason}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
