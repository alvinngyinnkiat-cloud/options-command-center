"use client";

import { useMemo, useState } from "react";
import { updateTradeCurrentValue } from "@/app/actions/trades";
import { Button } from "@/components/ui/Button";
import { calculateTotalPremiumReceived } from "@/lib/trades/calculations";
import {
  CURRENT_OPTION_VALUE_NOT_UPDATED,
  formatCurrency,
  formatCurrentOptionValueDisplay,
  OPTION_PRICE_INPUT_STEP,
} from "@/lib/trades/format";
import { formatPnL, getPnLColor } from "@/lib/format/pnl";
import { calculateCurrentCloseCost } from "@/lib/trades/valuation";
import type { EnrichedTrade } from "@/lib/trades/types";
import { cn } from "@/lib/utils";
import { X } from "lucide-react";

interface EditCurrentValueModalProps {
  trade: EnrichedTrade;
  onClose: () => void;
  onSaved: () => void;
}

function defaultUpdatedDate(trade: EnrichedTrade): string {
  if (trade.currentValueUpdatedAt) {
    return trade.currentValueUpdatedAt.slice(0, 10);
  }
  return new Date().toISOString().slice(0, 10);
}

function parseManualValueInput(raw: string): number | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;
  const parsed = parseFloat(trimmed);
  if (!Number.isFinite(parsed) || parsed < 0) return null;
  return parsed;
}

export function EditCurrentValueModal({
  trade,
  onClose,
  onSaved,
}: EditCurrentValueModalProps) {
  const [value, setValue] = useState(
    trade.manualCurrentOptionValue != null
      ? String(trade.manualCurrentOptionValue)
      : ""
  );
  const [updatedDate, setUpdatedDate] = useState(defaultUpdatedDate(trade));
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const previewPerContract = parseManualValueInput(value);

  const preview = useMemo(() => {
    if (previewPerContract == null) {
      return { closeCost: null, pnl: null };
    }
    const closeCost = calculateCurrentCloseCost(
      previewPerContract,
      trade.contracts
    );
    const premium = calculateTotalPremiumReceived(
      trade.premiumPerContract,
      trade.contracts
    );
    const pnl = premium - closeCost;
    return { closeCost, pnl };
  }, [previewPerContract, trade.contracts, trade.premiumPerContract]);

  const inputClass =
    "w-full h-9 rounded-md border border-terminal-border bg-terminal-surface px-3 font-mono text-sm text-terminal-text focus:outline-none focus:ring-1 focus:ring-accent/50";

  async function handleSave() {
    setSaving(true);
    setError(null);

    const trimmed = value.trim();
    if (trimmed) {
      const parsed = parseManualValueInput(trimmed);
      if (parsed == null) {
        setSaving(false);
        setError("Enter a valid option value of zero or greater.");
        return;
      }
    }

    try {
      const result = await updateTradeCurrentValue(trade.id, {
        currentOptionValue: trimmed ? parseManualValueInput(trimmed) : null,
        updatedDate: updatedDate || null,
        notes: notes.trim() || null,
      });

      if (!result || typeof result !== "object" || !("ok" in result)) {
        setError("Unexpected server response. Please refresh and try again.");
        return;
      }

      if (!result.ok) {
        setError(result.error || "Failed to save current option value.");
        return;
      }

      onSaved();
      onClose();
    } catch (saveError) {
      setError(
        saveError instanceof Error
          ? saveError.message || "Failed to save current option value."
          : "Failed to save current option value."
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="w-full max-w-lg rounded-lg border border-terminal-border bg-terminal-surface shadow-xl">
        <div className="flex items-center justify-between border-b border-terminal-border px-4 py-3">
          <div>
            <h2 className="text-sm font-medium text-terminal-text">
              Edit Current Option Value
            </h2>
            <p className="text-xs text-terminal-muted">
              {trade.ticker} · {trade.strategyLabel}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-terminal-muted hover:text-terminal-text"
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="space-y-4 p-4">
          <p className="text-xs text-terminal-muted">
            Manual entry only — used for Current P/L (Premium Received − Current
            Option Value).
          </p>

          <div>
            <label className="text-[10px] uppercase tracking-wider text-terminal-muted">
              Current Option Value ($/contract)
            </label>
            <input
              type="number"
              step={OPTION_PRICE_INPUT_STEP}
              min="0"
              value={value}
              onChange={(e) => setValue(e.target.value)}
              placeholder={CURRENT_OPTION_VALUE_NOT_UPDATED}
              className={inputClass}
            />
            <p className="mt-1 text-[10px] text-terminal-muted">
              Leave blank to clear the value ({CURRENT_OPTION_VALUE_NOT_UPDATED})
            </p>
          </div>

          <div>
            <label className="text-[10px] uppercase tracking-wider text-terminal-muted">
              Updated Date
            </label>
            <input
              type="date"
              value={updatedDate}
              onChange={(e) => setUpdatedDate(e.target.value)}
              className={inputClass}
            />
          </div>

          <div className="rounded-md border border-accent/30 bg-accent/10 px-3 py-2 text-xs">
            {previewPerContract == null ? (
              <p className="text-terminal-muted">
                Preview: {CURRENT_OPTION_VALUE_NOT_UPDATED}
              </p>
            ) : (
              <>
                <p className="text-terminal-muted">
                  Preview close cost:{" "}
                  <span className="font-mono text-terminal-text">
                    {formatCurrency(preview.closeCost ?? 0)}
                  </span>
                </p>
                <p className="text-terminal-muted">
                  Preview P/L (Premium − Current Value):{" "}
                  <span className={cn("font-mono", getPnLColor(preview.pnl ?? 0))}>
                    {formatPnL(preview.pnl ?? 0, { currency: "USD" })}
                  </span>
                </p>
              </>
            )}
          </div>

          <div>
            <label className="text-[10px] uppercase tracking-wider text-terminal-muted">
              Notes
            </label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. Mark from broker statement at close"
              className={inputClass}
            />
          </div>

          {error && <p className="text-xs text-loss">{error}</p>}
        </div>

        <div className="flex justify-end gap-2 border-t border-terminal-border px-4 py-3">
          <Button variant="ghost" size="sm" onClick={onClose}>
            Cancel
          </Button>
          <Button
            variant="primary"
            size="sm"
            onClick={handleSave}
            disabled={saving}
          >
            {saving ? "Saving…" : "Save Value"}
          </Button>
        </div>

        <p className="border-t border-terminal-border px-4 py-2 text-[10px] text-terminal-muted">
          Current:{" "}
          {formatCurrentOptionValueDisplay(trade.manualCurrentOptionValue)}
          {trade.currentValueUpdatedAt &&
            ` · Updated ${trade.currentValueUpdatedAt.slice(0, 10)}`}
        </p>
      </div>
    </div>
  );
}
