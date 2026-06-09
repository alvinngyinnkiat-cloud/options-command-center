"use client";

import { useState } from "react";
import { deleteCryptoHolding } from "@/app/actions/crypto";
import { Button } from "@/components/ui/Button";
import { PnlPercentValue, PnlValue } from "@/components/ui/PnlValue";
import type { EnrichedCryptoHolding } from "@/lib/crypto/types";
import { formatSGD } from "@/lib/utils";
import { Pencil, Trash2 } from "lucide-react";

interface CryptoHoldingsTableProps {
  holdings: EnrichedCryptoHolding[];
  onEdit: (holding: EnrichedCryptoHolding) => void;
  onRefresh: () => void;
}

export function CryptoHoldingsTable({
  holdings,
  onEdit,
  onRefresh,
}: CryptoHoldingsTableProps) {
  const [removingId, setRemovingId] = useState<string | null>(null);

  async function handleDelete(id: string) {
    if (!confirm("Delete this crypto holding?")) return;
    setRemovingId(id);
    await deleteCryptoHolding(id);
    setRemovingId(null);
    onRefresh();
  }

  return (
    <div className="overflow-x-auto rounded-lg border border-terminal-border">
      <table className="w-full min-w-[900px] text-xs">
        <thead>
          <tr className="border-b border-terminal-border bg-terminal-elevated/80 text-left uppercase tracking-wider text-terminal-muted">
            <th className="px-3 py-2.5 font-medium">Asset</th>
            <th className="px-3 py-2.5 font-medium">Ticker</th>
            <th className="px-3 py-2.5 font-medium text-right">Invested SGD</th>
            <th className="px-3 py-2.5 font-medium text-right">Current SGD</th>
            <th className="px-3 py-2.5 font-medium text-right">P/L SGD</th>
            <th className="px-3 py-2.5 font-medium text-right">Return %</th>
            <th className="px-3 py-2.5 font-medium text-right">Alloc %</th>
            <th className="px-3 py-2.5 font-medium">Notes</th>
            <th className="px-3 py-2.5 font-medium">Last Updated</th>
            <th className="px-3 py-2.5 font-medium">Actions</th>
          </tr>
        </thead>
        <tbody>
          {holdings.map((h) => (
            <tr
              key={h.id}
              className="border-b border-terminal-border/50 hover:bg-terminal-elevated/40"
            >
              <td className="px-3 py-2.5 font-medium text-terminal-text">
                {h.assetLabel}
              </td>
              <td className="px-3 py-2.5 font-mono font-semibold text-accent">
                {h.ticker}
              </td>
              <td className="px-3 py-2.5 font-mono text-right text-terminal-muted">
                {formatSGD(h.totalInvestedSgd)}
              </td>
              <td className="px-3 py-2.5 font-mono text-right text-terminal-text">
                {formatSGD(h.currentValueSgd)}
              </td>
              <td className="px-3 py-2.5 font-mono text-right font-medium">
                <PnlValue value={h.profitLossSgd} currency="SGD" />
              </td>
              <td className="px-3 py-2.5 font-mono text-right">
                <PnlPercentValue value={h.returnPct} />
              </td>
              <td className="px-3 py-2.5 font-mono text-right text-terminal-muted">
                {h.allocationPct.toFixed(1)}%
              </td>
              <td className="px-3 py-2.5 text-terminal-muted max-w-[160px] truncate">
                {h.notes ?? "—"}
              </td>
              <td className="px-3 py-2.5 text-terminal-muted">{h.lastUpdated}</td>
              <td className="px-3 py-2.5">
                <div className="flex gap-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onEdit(h)}
                    aria-label={`Edit ${h.ticker}`}
                  >
                    <Pencil className="h-3.5 w-3.5" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-loss"
                    disabled={removingId === h.id}
                    onClick={() => handleDelete(h.id)}
                    aria-label={`Delete ${h.ticker}`}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </td>
            </tr>
          ))}
          {holdings.length === 0 && (
            <tr>
              <td
                colSpan={10}
                className="px-3 py-10 text-center text-terminal-muted"
              >
                No crypto holdings. Add your first position.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
