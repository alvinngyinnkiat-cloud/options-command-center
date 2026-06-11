"use client";

import { useState } from "react";
import { applyCryptoManualAdjustment } from "@/app/actions/crypto";
import { Button } from "@/components/ui/Button";
import { buildCryptoHoldingMetrics } from "@/lib/crypto/calculations";
import type { EnrichedCryptoHolding } from "@/lib/crypto/types";
import { formatSGD, formatSignedSGD } from "@/lib/utils";
import { cn } from "@/lib/utils";
import { X } from "lucide-react";

const inputClass =
  "w-full rounded border border-terminal-border bg-terminal-elevated px-3 py-2 text-sm font-mono";

interface CryptoManualAdjustmentModalProps {
  holding: EnrichedCryptoHolding;
  onClose: () => void;
  onSaved: () => void;
}

export function CryptoManualAdjustmentModal({
  holding,
  onClose,
  onSaved,
}: CryptoManualAdjustmentModalProps) {
  const today = new Date().toISOString().split("T")[0];
  const [transactionDate, setTransactionDate] = useState(
    holding.lastUpdated || today
  );
  const [ticker, setTicker] = useState(holding.ticker);
  const [coinName, setCoinName] = useState<string>(holding.assetLabel);
  const [invested, setInvested] = useState(String(holding.totalInvestedSgd));
  const [current, setCurrent] = useState(String(holding.currentValueSgd));
  const [notes, setNotes] = useState(holding.notes ?? "");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const preview = buildCryptoHoldingMetrics(
    parseFloat(invested) || 0,
    parseFloat(current) || 0,
    parseFloat(current) || 0
  );

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    const result = await applyCryptoManualAdjustment({
      transactionDate,
      holdingId: holding.id,
      ticker: ticker.toUpperCase(),
      coinName,
      totalInvestedSgd: parseFloat(invested) || 0,
      currentValueSgd: parseFloat(current) || 0,
      notes: notes.trim() || null,
    });
    setSaving(false);
    if (!result.success) {
      setError(result.error);
      return;
    }
    onSaved();
    onClose();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="w-full max-w-lg rounded-lg border border-terminal-border bg-terminal-surface shadow-xl">
        <div className="flex items-center justify-between border-b border-terminal-border px-4 py-3">
          <h2 className="text-sm font-semibold text-terminal-text">
            Manual Adjustment — {holding.ticker}
          </h2>
          <Button variant="ghost" size="sm" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4 p-4">
          <p className="text-xs text-terminal-muted">
            Correct mistakes. Creates a Manual Adjustment transaction record.
          </p>
          <label className="block space-y-1">
            <span className="text-[10px] uppercase text-terminal-muted">Date</span>
            <input
              type="date"
              className={inputClass}
              value={transactionDate}
              onChange={(e) => setTransactionDate(e.target.value)}
              required
            />
          </label>
          <div className="grid grid-cols-2 gap-3">
            <label className="block space-y-1">
              <span className="text-[10px] uppercase text-terminal-muted">Ticker</span>
              <input
                className={inputClass}
                value={ticker}
                onChange={(e) => setTicker(e.target.value.toUpperCase())}
                required
              />
            </label>
            <label className="block space-y-1">
              <span className="text-[10px] uppercase text-terminal-muted">Coin Name</span>
              <input
                className={inputClass}
                value={coinName}
                onChange={(e) => setCoinName(e.target.value)}
              />
            </label>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <label className="block space-y-1">
              <span className="text-[10px] uppercase text-terminal-muted">
                Invested SGD
              </span>
              <input
                type="number"
                min="0"
                step="0.01"
                className={inputClass}
                value={invested}
                onChange={(e) => setInvested(e.target.value)}
                required
              />
            </label>
            <label className="block space-y-1">
              <span className="text-[10px] uppercase text-terminal-muted">
                Current SGD
              </span>
              <input
                type="number"
                min="0"
                step="0.01"
                className={inputClass}
                value={current}
                onChange={(e) => setCurrent(e.target.value)}
                required
              />
            </label>
          </div>
          <label className="block space-y-1">
            <span className="text-[10px] uppercase text-terminal-muted">Notes</span>
            <textarea
              className={`${inputClass} min-h-[60px]`}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </label>
          <div className="rounded-md border border-accent/30 bg-accent/5 grid grid-cols-2 gap-2 p-3 text-xs">
            <div>
              <p className="text-terminal-muted">P/L SGD</p>
              <p
                className={cn(
                  "font-mono font-semibold",
                  preview.profitLossSgd >= 0 ? "text-profit" : "text-loss"
                )}
              >
                {formatSignedSGD(preview.profitLossSgd)}
              </p>
            </div>
            <div>
              <p className="text-terminal-muted">Return %</p>
              <p className="font-mono font-semibold">
                {preview.returnPct.toFixed(1)}%
              </p>
            </div>
          </div>
          {parseFloat(current) > 0 && holding.currentValueSgd === 0 && (
            <p className="text-xs text-accent">
              Current SGD &gt; 0 will move this position back to Open Positions.
            </p>
          )}
          {error && <p className="text-xs text-loss">{error}</p>}
          <div className="flex justify-end gap-2">
            <Button type="button" variant="ghost" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" disabled={saving}>
              {saving ? "Saving…" : "Save"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
