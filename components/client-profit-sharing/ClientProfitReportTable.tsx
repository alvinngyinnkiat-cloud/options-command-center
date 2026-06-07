"use client";

import { useState, useTransition } from "react";
import { markClientAllocationPaid } from "@/app/actions/client-profit-sharing";
import { Button } from "@/components/ui/Button";
import { formatSignedCurrency } from "@/lib/trades/format";
import type { TradeAllocationRow } from "@/lib/client-profit-sharing/types";
import { cn } from "@/lib/utils";

interface ClientProfitReportTableProps {
  rows: TradeAllocationRow[];
  onRefresh: () => void;
}

export function ClientProfitReportTable({
  rows,
  onRefresh,
}: ClientProfitReportTableProps) {
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  const included = rows.filter((r) => r.includedInPool);

  function handleMarkPaid(allocationId: string) {
    setPendingId(allocationId);
    startTransition(async () => {
      await markClientAllocationPaid(allocationId);
      setPendingId(null);
      onRefresh();
    });
  }

  if (included.length === 0) {
    return (
      <p className="rounded-lg border border-dashed border-terminal-border px-4 py-6 text-center text-xs text-terminal-muted">
        No client profit sharing trades — create a trade with Client Profit Sharing ownership.
      </p>
    );
  }

  return (
    <div className="overflow-x-auto rounded-lg border border-terminal-border">
      <table className="w-full min-w-[1000px] text-xs">
        <thead>
          <tr className="border-b border-terminal-border bg-terminal-elevated/60 text-left uppercase tracking-wider text-terminal-muted">
            <th className="px-3 py-2 font-medium">Trade</th>
            <th className="px-3 py-2 font-medium">Strategy</th>
            <th className="px-3 py-2 font-medium">Entry</th>
            <th className="px-3 py-2 font-medium">Exit</th>
            <th className="px-3 py-2 font-medium text-right">Trade P/L</th>
            <th className="px-3 py-2 font-medium text-right">My Share</th>
            <th className="px-3 py-2 font-medium text-right">Client Share</th>
            <th className="px-3 py-2 font-medium">Status</th>
            <th className="px-3 py-2 font-medium">Paid / Unpaid</th>
            <th className="px-3 py-2 font-medium" />
          </tr>
        </thead>
        <tbody>
          {included.map((row) => (
            <tr
              key={row.tradeId}
              className="border-b border-terminal-border/40"
            >
              <td className="px-3 py-2 font-mono font-semibold">{row.ticker}</td>
              <td className="px-3 py-2 text-terminal-muted">
                {row.strategyLabel}
              </td>
              <td className="px-3 py-2 font-mono">{row.entryDate}</td>
              <td className="px-3 py-2 font-mono">{row.exitDate ?? "—"}</td>
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
                  row.myProfit >= 0 ? "text-profit" : "text-loss"
                )}
              >
                {formatSignedCurrency(row.myProfit)}
              </td>
              <td
                className={cn(
                  "px-3 py-2 font-mono text-right",
                  row.clientProfit >= 0 ? "text-profit" : "text-loss"
                )}
              >
                {formatSignedCurrency(row.clientProfit)}
              </td>
              <td className="px-3 py-2">{row.allocationStatus}</td>
              <td className="px-3 py-2">{row.paymentLabel}</td>
              <td className="px-3 py-2">
                {row.allocationStatus === "Unpaid" && row.allocationId && (
                  <Button
                    variant="ghost"
                    size="sm"
                    disabled={pendingId === row.allocationId}
                    onClick={() => handleMarkPaid(row.allocationId!)}
                  >
                    Mark Paid
                  </Button>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
