"use client";

import { useState } from "react";
import { deleteStockEtfHolding } from "@/app/actions/stock-etf";
import { Button } from "@/components/ui/Button";
import type { EnrichedStockEtfHolding } from "@/lib/stocks-etfs/types";
import { X } from "lucide-react";

interface StockEtfDeletePositionModalProps {
  holding: EnrichedStockEtfHolding;
  onClose: () => void;
  onDeleted: () => void;
}

export function StockEtfDeletePositionModal({
  holding,
  onClose,
  onDeleted,
}: StockEtfDeletePositionModalProps) {
  const [deleteTransactions, setDeleteTransactions] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  async function handleDelete() {
    setDeleting(true);
    setError(null);
    const result = await deleteStockEtfHolding(holding.id, {
      deleteTransactionHistory: deleteTransactions,
    });
    setDeleting(false);
    if (!result.success) {
      setError(result.error);
      return;
    }
    onDeleted();
    onClose();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="w-full max-w-md rounded-lg border border-terminal-border bg-terminal-surface shadow-xl">
        <div className="flex items-center justify-between border-b border-terminal-border px-4 py-3">
          <h2 className="text-sm font-semibold text-terminal-text">
            Delete Position — {holding.ticker}
          </h2>
          <Button variant="ghost" size="sm" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>

        <div className="space-y-4 p-4">
          <p className="text-xs text-terminal-muted">
            Remove this position from the tracker. Transaction history is stored
            in the same tables used by Buy, Sell, and Manual Adjustment.
          </p>

          <fieldset className="space-y-2">
            <legend className="text-[10px] uppercase tracking-wider text-terminal-muted">
              What to delete
            </legend>
            <label className="flex cursor-pointer items-start gap-2 rounded-md border border-terminal-border px-3 py-2 text-xs">
              <input
                type="radio"
                name="deleteScope"
                className="mt-0.5"
                checked={!deleteTransactions}
                onChange={() => setDeleteTransactions(false)}
              />
              <span>
                <span className="font-medium text-terminal-text">
                  Delete Position Only
                </span>
                <span className="mt-0.5 block text-terminal-muted">
                  Removes the position from your holdings list.
                </span>
              </span>
            </label>
            <label className="flex cursor-pointer items-start gap-2 rounded-md border border-terminal-border px-3 py-2 text-xs">
              <input
                type="radio"
                name="deleteScope"
                className="mt-0.5"
                checked={deleteTransactions}
                onChange={() => setDeleteTransactions(true)}
              />
              <span>
                <span className="font-medium text-terminal-text">
                  Delete Position + Transactions
                </span>
                <span className="mt-0.5 block text-terminal-muted">
                  Also removes buy/sell transactions and manual adjustment
                  history for this position.
                </span>
              </span>
            </label>
          </fieldset>

          {error && <p className="text-xs text-loss">{error}</p>}

          <div className="flex justify-end gap-2">
            <Button type="button" variant="ghost" onClick={onClose}>
              Cancel
            </Button>
            <Button
              type="button"
              variant="primary"
              className="bg-loss hover:bg-loss/90"
              disabled={deleting}
              onClick={handleDelete}
            >
              {deleting ? "Deleting…" : "Delete Position"}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
