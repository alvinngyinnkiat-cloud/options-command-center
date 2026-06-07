"use client";

import { useState, useTransition } from "react";
import { toggleTradeInClientPool } from "@/app/actions/client-profit-sharing";
import { formatSignedCurrency } from "@/lib/trades/format";
import type { TradeAllocationRow } from "@/lib/client-profit-sharing/types";
import { cn } from "@/lib/utils";

interface ClientTradeAllocationTableProps {
  rows: TradeAllocationRow[];
  activeClientId: string | null;
  onRefresh: () => void;
}

export function ClientTradeAllocationTable({
  rows,
  activeClientId,
  onRefresh,
}: ClientTradeAllocationTableProps) {
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  function handleToggle(tradeId: string, current: boolean) {
    if (!activeClientId) return;
    setPendingId(tradeId);
    startTransition(async () => {
      await toggleTradeInClientPool(activeClientId, tradeId, !current);
      setPendingId(null);
      onRefresh();
    });
  }

  return (
    <div className="overflow-x-auto rounded-lg border border-terminal-border">
      <table className="w-full min-w-[900px] text-xs">
        <thead>
          <tr className="border-b border-terminal-border bg-terminal-elevated/60 text-left uppercase tracking-wider text-terminal-muted">
            <th className="px-3 py-2 font-medium">In Pool</th>
            <th className="px-3 py-2 font-medium">Ticker</th>
            <th className="px-3 py-2 font-medium">Strategy</th>
            <th className="px-3 py-2 font-medium">Status</th>
            <th className="px-3 py-2 font-medium text-right">Trade P/L</th>
            <th className="px-3 py-2 font-medium text-right">Client Share</th>
            <th className="px-3 py-2 font-medium text-right">My Share</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr
              key={row.tradeId}
              className={cn(
                "border-b border-terminal-border/40",
                row.includedInPool && "bg-profit/5"
              )}
            >
              <td className="px-3 py-2">
                <input
                  type="checkbox"
                  checked={row.includedInPool}
                  disabled={!activeClientId || pendingId === row.tradeId}
                  onChange={() =>
                    handleToggle(row.tradeId, row.includedInPool)
                  }
                  className="h-4 w-4 accent-accent"
                />
              </td>
              <td className="px-3 py-2 font-mono font-semibold">{row.ticker}</td>
              <td className="px-3 py-2 text-terminal-muted">
                {row.strategyLabel}
              </td>
              <td className="px-3 py-2 text-terminal-muted">{row.statusLabel}</td>
              <td
                className={cn(
                  "px-3 py-2 font-mono text-right",
                  row.tradeProfit >= 0 ? "text-profit" : "text-loss"
                )}
              >
                {formatSignedCurrency(row.tradeProfit)}
              </td>
              <td
                className={cn(
                  "px-3 py-2 font-mono text-right",
                  row.includedInPool
                    ? row.clientProfit >= 0
                      ? "text-profit"
                      : "text-loss"
                    : "text-terminal-muted"
                )}
              >
                {row.includedInPool
                  ? formatSignedCurrency(row.clientProfit)
                  : "—"}
              </td>
              <td
                className={cn(
                  "px-3 py-2 font-mono text-right",
                  row.includedInPool
                    ? row.myProfit >= 0
                      ? "text-profit"
                      : "text-loss"
                    : "text-terminal-muted"
                )}
              >
                {row.includedInPool ? formatSignedCurrency(row.myProfit) : "—"}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
