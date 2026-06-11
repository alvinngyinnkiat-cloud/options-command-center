"use client";

import { useState, useTransition } from "react";
import { setStockEtfTrackingMode } from "@/app/actions/stock-etf";
import {
  STOCK_ETF_TRACKING_MODE_LABELS,
  type StockEtfTrackingMode,
} from "@/lib/stocks-etfs/tracking-mode";
import type { StockEtfTrackerData } from "@/lib/stocks-etfs/types";
import { cn } from "@/lib/utils";

interface StockEtfTrackingModeToggleProps {
  data: StockEtfTrackerData;
  onDataChange: (data: StockEtfTrackerData) => void;
}

export function StockEtfTrackingModeToggle({
  data,
  onDataChange,
}: StockEtfTrackingModeToggleProps) {
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const mode = data.trackingModeDefault;

  function select(next: StockEtfTrackingMode) {
    if (next === mode || isPending) return;
    setError(null);
    startTransition(async () => {
      const result = await setStockEtfTrackingMode(next);
      if (!result.success) {
        setError(result.error);
        return;
      }
      onDataChange(result.data);
    });
  }

  return (
    <div className="rounded-lg border border-terminal-border bg-terminal-surface p-4 space-y-3">
      <div>
        <h2 className="text-xs font-medium uppercase tracking-wider text-terminal-muted">
          Tracking Mode
        </h2>
        <p className="mt-1 text-[11px] text-terminal-muted">
          Manual Position for historical backfill. Transaction Accounting for
          buy/sell/dividend history going forward.
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        {(["manual", "transaction"] as const).map((value) => (
          <button
            key={value}
            type="button"
            disabled={isPending}
            onClick={() => select(value)}
            className={cn(
              "rounded-md border px-3 py-2 text-xs font-medium transition-colors",
              mode === value
                ? "border-accent bg-accent/10 text-accent"
                : "border-terminal-border text-terminal-muted hover:border-terminal-muted hover:text-terminal-text"
            )}
          >
            {STOCK_ETF_TRACKING_MODE_LABELS[value]}
          </button>
        ))}
      </div>

      {mode === "transaction" && !data.ledgerAvailable && (
        <p className="rounded-md border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-xs text-amber-300">
          Ledger table is not available. Transactions still save to{" "}
          <code className="font-mono">stock_etf_transactions</code>; the unified
          audit log is skipped.
        </p>
      )}

      {error && <p className="text-xs text-loss">{error}</p>}
    </div>
  );
}
