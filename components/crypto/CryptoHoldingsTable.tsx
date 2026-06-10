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
  variant: "open" | "closed";
  onEdit?: (holding: EnrichedCryptoHolding) => void;
  onRefresh: () => void;
  emptyMessage: string;
}

export function CryptoHoldingsTable({
  holdings,
  variant,
  onEdit,
  onRefresh,
  emptyMessage,
}: CryptoHoldingsTableProps) {
  const [removingId, setRemovingId] = useState<string | null>(null);
  const isOpen = variant === "open";

  async function handleDelete(id: string) {
    if (!confirm("Delete this crypto holding?")) return;
    setRemovingId(id);
    await deleteCryptoHolding(id);
    setRemovingId(null);
    onRefresh();
  }

  if (holdings.length === 0) {
    return (
      <p className="rounded-lg border border-dashed border-terminal-border px-4 py-8 text-center text-sm text-terminal-muted">
        {emptyMessage}
      </p>
    );
  }

  return (
    <>
      {/* Mobile — card layout, no horizontal scroll */}
      <div className="space-y-3 md:hidden">
        {holdings.map((h) => (
          <article
            key={h.id}
            className="rounded-lg border border-terminal-border bg-terminal-surface p-3 space-y-2"
          >
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="font-mono text-sm font-semibold text-accent">
                  {h.ticker}
                </p>
                <p className="text-xs text-terminal-muted">{h.assetLabel}</p>
              </div>
              {isOpen && onEdit && (
                <div className="flex gap-1 shrink-0">
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
              )}
            </div>
            <dl className="grid grid-cols-2 gap-x-3 gap-y-1.5 text-xs">
              <Field label="Invested SGD" value={formatSGD(h.totalInvestedSgd)} />
              <Field label="Current SGD" value={formatSGD(h.currentValueSgd)} />
              <div>
                <dt className="text-terminal-muted">P/L SGD</dt>
                <dd className="font-mono tabular-nums">
                  <PnlValue value={h.profitLossSgd} currency="SGD" />
                </dd>
              </div>
              <div>
                <dt className="text-terminal-muted">Return %</dt>
                <dd className="font-mono tabular-nums">
                  <PnlPercentValue value={h.returnPct} />
                </dd>
              </div>
              {isOpen ? (
                <>
                  <Field
                    label="Allocation %"
                    value={`${h.allocationPct.toFixed(1)}%`}
                  />
                  <Field label="Last Updated" value={h.lastUpdated} />
                </>
              ) : (
                <Field label="Closed Date" value={h.lastUpdated} />
              )}
            </dl>
            {h.notes && (
              <p className="text-xs text-terminal-muted break-words">
                {h.notes}
              </p>
            )}
          </article>
        ))}
      </div>

      {/* Desktop — full table */}
      <div className="hidden md:block rounded-lg border border-terminal-border overflow-hidden">
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b border-terminal-border bg-terminal-elevated/80 text-left uppercase tracking-wider text-terminal-muted">
              <th className="px-3 py-2.5 font-medium">Asset</th>
              <th className="px-3 py-2.5 font-medium">Ticker</th>
              <th className="px-3 py-2.5 font-medium text-right">Invested SGD</th>
              <th className="px-3 py-2.5 font-medium text-right">Current SGD</th>
              <th className="px-3 py-2.5 font-medium text-right">P/L SGD</th>
              <th className="px-3 py-2.5 font-medium text-right">Return %</th>
              {isOpen && (
                <th className="px-3 py-2.5 font-medium text-right">Alloc %</th>
              )}
              {isOpen ? (
                <th className="px-3 py-2.5 font-medium">Last Updated</th>
              ) : (
                <th className="px-3 py-2.5 font-medium">Closed Date</th>
              )}
              <th className="px-3 py-2.5 font-medium">Notes</th>
              {isOpen && onEdit && (
                <th className="px-3 py-2.5 font-medium">Actions</th>
              )}
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
                <td className="px-3 py-2.5 font-mono text-right text-terminal-muted tabular-nums">
                  {formatSGD(h.totalInvestedSgd)}
                </td>
                <td className="px-3 py-2.5 font-mono text-right text-terminal-text tabular-nums">
                  {formatSGD(h.currentValueSgd)}
                </td>
                <td className="px-3 py-2.5 font-mono text-right font-medium tabular-nums">
                  <PnlValue value={h.profitLossSgd} currency="SGD" />
                </td>
                <td className="px-3 py-2.5 font-mono text-right tabular-nums">
                  <PnlPercentValue value={h.returnPct} />
                </td>
                {isOpen && (
                  <td className="px-3 py-2.5 font-mono text-right text-terminal-muted tabular-nums">
                    {h.allocationPct.toFixed(1)}%
                  </td>
                )}
                <td className="px-3 py-2.5 text-terminal-muted whitespace-nowrap">
                  {h.lastUpdated}
                </td>
                <td className="px-3 py-2.5 text-terminal-muted max-w-[200px] whitespace-normal break-words">
                  {h.notes ?? "—"}
                </td>
                {isOpen && onEdit && (
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
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-terminal-muted">{label}</dt>
      <dd className="font-mono text-terminal-text tabular-nums break-words">
        {value}
      </dd>
    </div>
  );
}
