"use client";

import { useMemo, useState } from "react";
import { adjustStockEtfPosition } from "@/app/actions/stock-etf-positions";
import { Button } from "@/components/ui/Button";
import { calculateManualPositionMetrics } from "@/lib/stocks-etfs/manual-position";
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
  const [totalCost, setTotalCost] = useState(
    String(holding.totalInvestedNative ?? "")
  );
  const [currentValue, setCurrentValue] = useState(
    String(holding.currentValueNative ?? "")
  );
  const [totalDividend, setTotalDividend] = useState(
    String(holding.manualTotalDividend ?? 0)
  );
  const [totalFees, setTotalFees] = useState(
    String(holding.manualTotalFees ?? 0)
  );
  const [notes, setNotes] = useState(holding.notes ?? "");
  const [adjustmentReason, setAdjustmentReason] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const preview = useMemo(() => {
    const capital = parseFloat(totalCost) || 0;
    const current = parseFloat(currentValue) || 0;
    const dividend = parseFloat(totalDividend) || 0;
    const fees = parseFloat(totalFees) || 0;
    return calculateManualPositionMetrics({
      capitalInvested: capital,
      currentValue: current,
      totalDividend: dividend,
      totalFees: fees,
    });
  }, [totalCost, currentValue, totalDividend, totalFees]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);

    const sharesNum = parseFloat(shares);
    const totalNum = parseFloat(totalCost);
    const currentNum = parseFloat(currentValue);
    const dividendNum = parseFloat(totalDividend) || 0;
    const feesNum = parseFloat(totalFees) || 0;
    const averageCost =
      sharesNum > 0 ? totalNum / sharesNum : parseFloat(String(holding.averageCost ?? 0));

    if (!Number.isFinite(sharesNum) || sharesNum < 0) {
      setError("Enter valid shares.");
      setSaving(false);
      return;
    }
    if (!Number.isFinite(totalNum) || totalNum < 0) {
      setError("Enter valid capital invested.");
      setSaving(false);
      return;
    }
    if (!Number.isFinite(currentNum) || currentNum < 0) {
      setError("Enter valid current value.");
      setSaving(false);
      return;
    }
    if (!adjustmentReason.trim()) {
      setError("Correction reason is required.");
      setSaving(false);
      return;
    }

    const result = await adjustStockEtfPosition({
      holdingId: holding.id,
      shares: sharesNum,
      averageCost: Number.isFinite(averageCost) ? averageCost : 0,
      totalCost: totalNum,
      currentValueNative: currentNum,
      manualTotalDividend: dividendNum,
      manualTotalFees: feesNum,
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

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="max-h-[90vh] w-full max-w-md overflow-y-auto rounded-lg border border-terminal-border bg-terminal-surface shadow-xl">
        <div className="flex items-center justify-between border-b border-terminal-border px-4 py-3">
          <div>
            <h2 className="text-sm font-semibold text-terminal-text">
              Manual Adjustment — {holding.ticker}
            </h2>
            <p className="text-[11px] text-terminal-muted">
              Corrections only — transaction history is preserved
            </p>
          </div>
          <Button variant="ghost" size="sm" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 p-4">
          <label className="block space-y-1">
            <span className="text-[10px] uppercase text-terminal-muted">Shares</span>
            <input
              type="number"
              min="0"
              step="any"
              className={inputClass}
              value={shares}
              onChange={(e) => setShares(e.target.value)}
              required
            />
          </label>

          <label className="block space-y-1">
            <span className="text-[10px] uppercase text-terminal-muted">
              Capital Invested ({holding.currency})
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
          </label>

          <label className="block space-y-1">
            <span className="text-[10px] uppercase text-terminal-muted">
              Current Value ({holding.currency})
            </span>
            <input
              type="number"
              min="0"
              step="any"
              className={inputClass}
              value={currentValue}
              onChange={(e) => setCurrentValue(e.target.value)}
              required
            />
          </label>

          <div className="grid grid-cols-2 gap-3">
            <label className="block space-y-1">
              <span className="text-[10px] uppercase text-terminal-muted">
                Total Dividend ({holding.currency})
              </span>
              <input
                type="number"
                min="0"
                step="0.01"
                className={inputClass}
                value={totalDividend}
                onChange={(e) => setTotalDividend(e.target.value)}
              />
            </label>
            <label className="block space-y-1">
              <span className="text-[10px] uppercase text-terminal-muted">
                Total Fees ({holding.currency})
              </span>
              <input
                type="number"
                min="0"
                step="0.01"
                className={inputClass}
                value={totalFees}
                onChange={(e) => setTotalFees(e.target.value)}
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

          <label className="block space-y-1">
            <span className="text-[10px] uppercase text-terminal-muted">
              Correction Reason (required)
            </span>
            <input
              type="text"
              className={inputClass}
              value={adjustmentReason}
              onChange={(e) => setAdjustmentReason(e.target.value)}
              placeholder="e.g. Wrong P/L, broker import fix, split adjustment"
              required
            />
          </label>

          <div className="rounded border border-terminal-border bg-terminal-elevated/30 px-3 py-2 text-xs space-y-1">
            <p className="text-terminal-muted">
              Asset P/L: {formatNativeValue(preview.assetPl, holding.currency)} · ROI{" "}
              {preview.roiPct.toFixed(1)}%
            </p>
            <p className="text-terminal-muted">
              P/L incl. dividend:{" "}
              {formatNativeValue(preview.plIncludingDividend, holding.currency)}
            </p>
          </div>

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
