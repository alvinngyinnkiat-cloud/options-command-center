"use client";

import { useState } from "react";
import { deleteStockEtfHolding } from "@/app/actions/stock-etf";
import { Button } from "@/components/ui/Button";
import { formatNativeValue } from "@/lib/portfolio/format-holdings";
import type { EnrichedStockEtfHolding } from "@/lib/stocks-etfs/types";
import { cn, formatSGD, formatSignedSGD } from "@/lib/utils";
import { Pencil, Trash2 } from "lucide-react";

interface StockEtfHoldingsTableProps {
  holdings: EnrichedStockEtfHolding[];
  onEdit: (holding: EnrichedStockEtfHolding) => void;
  onRefresh: () => void;
}

export function StockEtfHoldingsTable({
  holdings,
  onEdit,
  onRefresh,
}: StockEtfHoldingsTableProps) {
  const [removingId, setRemovingId] = useState<string | null>(null);

  async function handleDelete(id: string) {
    if (!confirm("Delete this holding?")) return;
    setRemovingId(id);
    await deleteStockEtfHolding(id);
    setRemovingId(null);
    onRefresh();
  }

  return (
    <div className="overflow-x-auto rounded-lg border border-terminal-border">
      <table className="w-full min-w-[1100px] text-xs">
        <thead>
          <tr className="border-b border-terminal-border bg-terminal-elevated/80 text-left uppercase tracking-wider text-terminal-muted">
            <th className="px-3 py-2.5 font-medium">Ticker</th>
            <th className="px-3 py-2.5 font-medium">Type</th>
            <th className="px-3 py-2.5 font-medium">Currency</th>
            <th className="px-3 py-2.5 font-medium text-right">Capital Invested</th>
            <th className="px-3 py-2.5 font-medium text-right">Current Value</th>
            <th className="px-3 py-2.5 font-medium text-right">P/L (SGD)</th>
            <th className="px-3 py-2.5 font-medium text-right">Return %</th>
            <th className="px-3 py-2.5 font-medium text-right">Alloc %</th>
            <th className="px-3 py-2.5 font-medium">Sector</th>
            <th className="px-3 py-2.5 font-medium">Actions</th>
          </tr>
        </thead>
        <tbody>
          {holdings.map((h) => (
            <tr
              key={h.id}
              className="border-b border-terminal-border/50 hover:bg-terminal-elevated/40"
            >
              <td className="px-3 py-2.5 font-mono font-semibold text-accent">
                {h.ticker}
              </td>
              <td className="px-3 py-2.5 capitalize text-terminal-muted">
                {h.assetType}
              </td>
              <td className="px-3 py-2.5 text-terminal-muted">{h.currency}</td>
              <td className="px-3 py-2.5 text-right">
                <p className="font-mono text-terminal-text">
                  {formatSGD(h.totalInvestedSgd)}
                </p>
                <p className="text-[10px] text-terminal-muted">
                  {formatNativeValue(h.totalInvestedNative, h.currency)}
                </p>
              </td>
              <td className="px-3 py-2.5 text-right">
                <p className="font-mono text-terminal-text">
                  {formatSGD(h.currentValueSgd)}
                </p>
                <p className="text-[10px] text-terminal-muted">
                  {formatNativeValue(h.currentValueNative, h.currency)}
                </p>
              </td>
              <td
                className={cn(
                  "px-3 py-2.5 font-mono text-right font-medium",
                  h.profitLossSgd >= 0 ? "text-profit" : "text-loss"
                )}
              >
                {formatSignedSGD(h.profitLossSgd)}
              </td>
              <td
                className={cn(
                  "px-3 py-2.5 font-mono text-right",
                  h.returnPct >= 0 ? "text-profit" : "text-loss"
                )}
              >
                {h.returnPct.toFixed(1)}%
              </td>
              <td className="px-3 py-2.5 font-mono text-right text-terminal-muted">
                {h.allocationPct.toFixed(1)}%
              </td>
              <td className="px-3 py-2.5 text-terminal-muted">{h.sector}</td>
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
                No stock or ETF holdings. Add your first position.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
