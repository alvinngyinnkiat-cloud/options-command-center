"use client";

import { useState } from "react";
import { addStockEtfTransaction } from "@/app/actions/stock-etf-positions";
import { Button } from "@/components/ui/Button";
import type { EnrichedStockEtfHolding } from "@/lib/stocks-etfs/types";
import { formatNativeValue } from "@/lib/portfolio/format-holdings";
import { X } from "lucide-react";

interface StockEtfBuySellModalProps {
  holding: EnrichedStockEtfHolding;
  transactionType: "buy" | "sell";
  onClose: () => void;
  onSaved: () => void;
}

const inputClass =
  "w-full rounded border border-terminal-border bg-terminal-elevated px-3 py-2 text-sm font-mono";

export function StockEtfBuySellModal({
  holding,
  transactionType,
  onClose,
  onSaved,
}: StockEtfBuySellModalProps) {
  const today = new Date().toISOString().split("T")[0];
  const [transactionDate, setTransactionDate] = useState(today);
  const [shares, setShares] = useState("");
  const [pricePerShare, setPricePerShare] = useState("");
  const [fees, setFees] = useState("0");
  const [notes, setNotes] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const sharesNum = parseFloat(shares) || 0;
  const priceNum = parseFloat(pricePerShare) || 0;
  const totalAmount = sharesNum * priceNum;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);

    const result = await addStockEtfTransaction({
      holdingId: holding.id,
      transactionType,
      transactionDate,
      shares: sharesNum,
      pricePerShare: priceNum,
      fees: parseFloat(fees) || 0,
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
      <div className="w-full max-w-md rounded-lg border border-terminal-border bg-terminal-surface shadow-xl">
        <div className="flex items-center justify-between border-b border-terminal-border px-4 py-3">
          <h2 className="text-sm font-semibold text-terminal-text">
            {transactionType === "buy" ? "Add Buy" : "Add Sell"} — {holding.ticker}
          </h2>
          <Button variant="ghost" size="sm" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 p-4">
          <p className="text-xs text-terminal-muted">
            Record a {transactionType} transaction. Position recalculates from
            transaction history — history is never overwritten.
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
              <span className="text-[10px] uppercase text-terminal-muted">
                Shares
              </span>
              <input
                type="number"
                min="0.0001"
                step="any"
                className={inputClass}
                value={shares}
                onChange={(e) => setShares(e.target.value)}
                required
              />
            </label>
            <label className="block space-y-1">
              <span className="text-[10px] uppercase text-terminal-muted">
                Price / Share ({holding.currency})
              </span>
              <input
                type="number"
                min="0"
                step="any"
                className={inputClass}
                value={pricePerShare}
                onChange={(e) => setPricePerShare(e.target.value)}
                required
              />
            </label>
          </div>

          <label className="block space-y-1">
            <span className="text-[10px] uppercase text-terminal-muted">Fees</span>
            <input
              type="number"
              min="0"
              step="0.01"
              className={inputClass}
              value={fees}
              onChange={(e) => setFees(e.target.value)}
            />
          </label>

          <div className="rounded-md border border-terminal-border/60 bg-terminal-elevated/20 px-3 py-2 text-xs">
            <span className="text-terminal-muted">Total amount: </span>
            <span className="font-mono text-terminal-text">
              {formatNativeValue(totalAmount, holding.currency)}
            </span>
          </div>

          <label className="block space-y-1">
            <span className="text-[10px] uppercase text-terminal-muted">Notes</span>
            <textarea
              className={`${inputClass} min-h-[60px]`}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </label>

          {error && <p className="text-xs text-loss">{error}</p>}

          <div className="flex justify-end gap-2">
            <Button type="button" variant="ghost" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" disabled={saving}>
              {saving ? "Saving…" : "Save Transaction"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
