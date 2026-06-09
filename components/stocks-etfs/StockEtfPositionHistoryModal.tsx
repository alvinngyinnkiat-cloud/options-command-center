"use client";

import { useEffect, useState } from "react";
import {
  getStockEtfAdjustmentHistory,
  getStockEtfTransactionHistory,
} from "@/app/actions/stock-etf-positions";
import { Button } from "@/components/ui/Button";
import type {
  EnrichedStockEtfPositionAdjustment,
  EnrichedStockEtfTransaction,
} from "@/lib/stocks-etfs/position-types";
import type { EnrichedStockEtfHolding } from "@/lib/stocks-etfs/types";
import { formatNativeValue } from "@/lib/portfolio/format-holdings";
import { X } from "lucide-react";

type HistoryMode = "transactions" | "adjustments";

interface StockEtfPositionHistoryModalProps {
  holding: EnrichedStockEtfHolding;
  mode: HistoryMode;
  onClose: () => void;
}

function formatFieldChange(
  label: string,
  previous: number | string | null,
  next: number | string | null,
  currency?: string
): string {
  const fmt = (v: number | string | null) => {
    if (v == null || v === "") return "—";
    if (typeof v === "number" && currency) {
      return formatNativeValue(v, currency as "USD" | "SGD");
    }
    return String(v);
  };
  return `${label}: ${fmt(previous)} → ${fmt(next)}`;
}

export function StockEtfPositionHistoryModal({
  holding,
  mode,
  onClose,
}: StockEtfPositionHistoryModalProps) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [transactions, setTransactions] = useState<EnrichedStockEtfTransaction[]>(
    []
  );
  const [adjustments, setAdjustments] = useState<
    EnrichedStockEtfPositionAdjustment[]
  >([]);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      setError(null);
      if (mode === "transactions") {
        const result = await getStockEtfTransactionHistory(holding.id);
        if (cancelled) return;
        if (!result.success) {
          setError(result.error);
        } else {
          setTransactions(result.data);
        }
      } else {
        const result = await getStockEtfAdjustmentHistory(holding.id);
        if (cancelled) return;
        if (!result.success) {
          setError(result.error);
        } else {
          setAdjustments(result.data);
        }
      }
      setLoading(false);
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [holding.id, mode]);

  const title =
    mode === "transactions"
      ? `Transactions — ${holding.ticker}`
      : `Adjustment History — ${holding.ticker}`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="flex max-h-[85vh] w-full max-w-2xl flex-col rounded-lg border border-terminal-border bg-terminal-surface shadow-xl">
        <div className="flex items-center justify-between border-b border-terminal-border px-4 py-3">
          <h2 className="text-sm font-semibold text-terminal-text">{title}</h2>
          <Button variant="ghost" size="sm" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>

        <div className="flex-1 overflow-y-auto p-4">
          {loading && (
            <p className="text-sm text-terminal-muted">Loading…</p>
          )}
          {error && <p className="text-sm text-loss">{error}</p>}

          {!loading && !error && mode === "transactions" && (
            <>
              {transactions.length === 0 ? (
                <p className="text-sm text-terminal-muted">
                  No transactions recorded yet.
                </p>
              ) : (
                <div className="space-y-3">
                  {transactions.map((tx) => (
                    <div
                      key={tx.id}
                      className="rounded-md border border-terminal-border/60 bg-terminal-elevated/20 px-3 py-2 text-xs"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-semibold uppercase text-terminal-text">
                          {tx.transactionType}
                        </span>
                        <span className="text-terminal-muted">
                          {tx.transactionDate}
                        </span>
                      </div>
                      <p className="mt-1 font-mono">
                        {tx.shares} @{" "}
                        {formatNativeValue(tx.pricePerShare, holding.currency)}{" "}
                        = {formatNativeValue(tx.totalAmount, holding.currency)}
                        {tx.fees > 0 &&
                          ` (+ fees ${formatNativeValue(tx.fees, holding.currency)})`}
                      </p>
                      {tx.notes && (
                        <p className="mt-1 text-terminal-muted">{tx.notes}</p>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </>
          )}

          {!loading && !error && mode === "adjustments" && (
            <>
              {adjustments.length === 0 ? (
                <p className="text-sm text-terminal-muted">
                  No manual adjustments recorded yet.
                </p>
              ) : (
                <div className="space-y-3">
                  {adjustments.map((adj) => (
                    <div
                      key={adj.id}
                      className="rounded-md border border-terminal-border/60 bg-terminal-elevated/20 px-3 py-2 text-xs space-y-1"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-semibold text-terminal-text">
                          Manual adjustment
                        </span>
                        <span className="text-terminal-muted">
                          {adj.adjustmentDate}
                        </span>
                      </div>
                      <p className="text-terminal-muted">
                        User: {adj.userId.slice(0, 8)}…
                      </p>
                      <p className="font-medium text-accent">
                        Reason: {adj.adjustmentReason}
                      </p>
                      <ul className="mt-1 space-y-0.5 font-mono text-[11px] text-terminal-muted">
                        {adj.previousShares !== adj.newShares && (
                          <li>
                            {formatFieldChange(
                              "Shares",
                              adj.previousShares,
                              adj.newShares
                            )}
                          </li>
                        )}
                        {adj.previousAverageCost !== adj.newAverageCost && (
                          <li>
                            {formatFieldChange(
                              "Avg cost",
                              adj.previousAverageCost,
                              adj.newAverageCost,
                              holding.currency
                            )}
                          </li>
                        )}
                        {adj.previousTotalCost !== adj.newTotalCost && (
                          <li>
                            {formatFieldChange(
                              "Total cost",
                              adj.previousTotalCost,
                              adj.newTotalCost,
                              holding.currency
                            )}
                          </li>
                        )}
                        {adj.previousNotes !== adj.newNotes && (
                          <li>
                            {formatFieldChange(
                              "Notes",
                              adj.previousNotes,
                              adj.newNotes
                            )}
                          </li>
                        )}
                      </ul>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
