"use client";

import { useMemo, useState } from "react";
import { adjustStockEtfPosition } from "@/app/actions/stock-etf-positions";
import { Button } from "@/components/ui/Button";
import type { EnrichedStockEtfHolding } from "@/lib/stocks-etfs/types";
import { formatNativeValue } from "@/lib/portfolio/format-holdings";
import { X } from "lucide-react";

interface StockEtfEditPositionModalProps {
  holding: EnrichedStockEtfHolding;
  onClose: () => void;
  onSaved: () => void;
}

const inputClass =
  "w-full rounded border border-terminal-border bg-terminal-elevated px-3 py-2 text-sm font-mono";

export function StockEtfEditPositionModal({
  holding,
  onClose,
  onSaved,
}: StockEtfEditPositionModalProps) {
  const [shares, setShares] = useState(String(holding.sharesHeld ?? ""));
  const [averageCost, setAverageCost] = useState(String(holding.averageCost ?? ""));
  const [totalCost, setTotalCost] = useState(
    String(holding.totalInvestedNative ?? "")
  );
  const [notes, setNotes] = useState(holding.notes ?? "");
  const [adjustmentReason, setAdjustmentReason] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const previewTotal = useMemo(() => {
    const s = parseFloat(shares);
    const avg = parseFloat(averageCost);
    if (Number.isFinite(s) && Number.isFinite(avg) && s > 0 && avg >= 0) {
      return s * avg;
    }
    return null;
  }, [shares, averageCost]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);

    const sharesNum = parseFloat(shares);
    const avgNum = parseFloat(averageCost);
    const totalNum = parseFloat(totalCost);

    if (!Number.isFinite(sharesNum) || sharesNum < 0) {
      setError("Enter valid shares.");
      setSaving(false);
      return;
    }
    if (!Number.isFinite(avgNum) || avgNum < 0) {
      setError("Enter valid average cost.");
      setSaving(false);
      return;
    }
    if (!Number.isFinite(totalNum) || totalNum < 0) {
      setError("Enter valid total cost.");
      setSaving(false);
      return;
    }
    if (!adjustmentReason.trim()) {
      setError("Adjustment reason is required.");
      setSaving(false);
      return;
    }

    const result = await adjustStockEtfPosition({
      holdingId: holding.id,
      shares: sharesNum,
      averageCost: avgNum,
      totalCost: totalNum,
      notes: notes.trim() || null,
      adjustmentReason: adjustmentReason.trim(),
    });

    setSaving(false);
    if (!result.success) {
      setError(result.error);
      return;
    }
    onSaved();
    onClose();
  }

  function syncTotalFromSharesAvg() {
    if (previewTotal != null) setTotalCost(String(previewTotal));
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="w-full max-w-md rounded-lg border border-terminal-border bg-terminal-surface shadow-xl">
        <div className="flex items-center justify-between border-b border-terminal-border px-4 py-3">
          <h2 className="text-sm font-semibold text-terminal-text">
            Edit Position — {holding.ticker}
          </h2>
          <Button variant="ghost" size="sm" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 p-4">
          <p className="text-xs text-terminal-muted">
            Manual override for setup, transfers, splits, or corrections. Creates
            an adjustment record — transaction history is preserved.
          </p>

          <label className="block space-y-1">
            <span className="text-[10px] uppercase text-terminal-muted">
              Shares
            </span>
            <input
              type="number"
              min="0"
              step="any"
              className={inputClass}
              value={shares}
              onChange={(e) => setShares(e.target.value)}
              onBlur={syncTotalFromSharesAvg}
              required
            />
          </label>

          <label className="block space-y-1">
            <span className="text-[10px] uppercase text-terminal-muted">
              Average Cost ({holding.currency})
            </span>
            <input
              type="number"
              min="0"
              step="any"
              className={inputClass}
              value={averageCost}
              onChange={(e) => setAverageCost(e.target.value)}
              onBlur={syncTotalFromSharesAvg}
              required
            />
          </label>

          <label className="block space-y-1">
            <span className="text-[10px] uppercase text-terminal-muted">
              Total Cost ({holding.currency})
            </span>
            <input
              type="number"
              min="0"
              step="any"
              className={inputClass}
              value={totalCost}
              onChange={(e) => setTotalCost(e.target.value)}
              required
            />
            {previewTotal != null && (
              <p className="text-[10px] text-terminal-muted">
                Shares × Avg ={" "}
                {formatNativeValue(previewTotal, holding.currency)}
              </p>
            )}
          </label>

          <label className="block space-y-1">
            <span className="text-[10px] uppercase text-terminal-muted">Notes</span>
            <textarea
              className={`${inputClass} min-h-[60px]`}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </label>

          <label className="block space-y-1">
            <span className="text-[10px] uppercase text-terminal-muted">
              Adjustment Reason (required)
            </span>
            <input
              type="text"
              className={inputClass}
              value={adjustmentReason}
              onChange={(e) => setAdjustmentReason(e.target.value)}
              placeholder="e.g. Broker transfer, stock split, import correction"
              required
            />
          </label>

          {error && <p className="text-xs text-loss">{error}</p>}

          <div className="flex justify-end gap-2">
            <Button type="button" variant="ghost" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" disabled={saving}>
              {saving ? "Saving…" : "Save Adjustment"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
