"use client";

import { useMemo, useState } from "react";
import { updateTradeCurrentValue } from "@/app/actions/trades";
import { Button } from "@/components/ui/Button";
import { calculateTotalPremiumReceived } from "@/lib/trades/calculations";
import { calculateCurrentCloseCost } from "@/lib/trades/valuation";
import {
  formatCurrency,
  formatOptionValuePerContract,
  formatSignedCurrency,
  formatValueSourceLabel,
} from "@/lib/trades/format";
import type { EnrichedTrade } from "@/lib/trades/types";
import { cn } from "@/lib/utils";
import { X } from "lucide-react";

interface EditCurrentValueModalProps {
  trade: EnrichedTrade;
  onClose: () => void;
  onSaved: () => void;
}

export function EditCurrentValueModal({
  trade,
  onClose,
  onSaved,
}: EditCurrentValueModalProps) {
  const [value, setValue] = useState(String(trade.currentOptionValue));
  const [source, setSource] = useState<"manual" | "broker">(
    trade.currentValueSource === "broker" ? "broker" : "manual"
  );
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const preview = useMemo(() => {
    const perContract = parseFloat(value) || 0;
    const closeCost = calculateCurrentCloseCost(perContract, trade.contracts);
    const premium = calculateTotalPremiumReceived(
      trade.premiumPerContract,
      trade.contracts
    );
    const pnl = premium - closeCost;
    return { perContract, closeCost, pnl };
  }, [value, trade.contracts, trade.premiumPerContract]);

  const inputClass =
    "w-full h-9 rounded-md border border-terminal-border bg-terminal-surface px-3 font-mono text-sm text-terminal-text focus:outline-none focus:ring-1 focus:ring-accent/50";

  async function handleSave() {
    setSaving(true);
    setError(null);

    const result = await updateTradeCurrentValue(trade.id, {
      currentOptionValue: parseFloat(value) || 0,
      source,
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
          <div className="grid grid-cols-2 gap-3 text-xs">
            <div className="rounded-md border border-terminal-border bg-terminal-elevated px-3 py-2">
              <p className="text-[10px] uppercase text-terminal-muted">
                System Value
              </p>
              <p className="font-mono text-terminal-text">
                {formatOptionValuePerContract(trade.systemCurrentOptionValue)}
              </p>
            </div>
            <div className="rounded-md border border-terminal-border bg-terminal-elevated px-3 py-2">
              <p className="text-[10px] uppercase text-terminal-muted">
                Manual Broker Value
              </p>
              <p className="font-mono text-terminal-text">
                {trade.manualCurrentOptionValue != null
                  ? formatOptionValuePerContract(trade.manualCurrentOptionValue)
                  : "—"}
              </p>
            </div>
          </div>

          {trade.valueDifference != null && (
            <p className="text-xs text-terminal-muted">
              Difference (manual − system):{" "}
              <span
                className={cn(
                  "font-mono",
                  trade.valueDifference >= 0 ? "text-warning" : "text-profit"
                )}
              >
                {formatOptionValuePerContract(trade.valueDifference)}
              </span>
            </p>
          )}

          <div>
            <label className="text-[10px] uppercase tracking-wider text-terminal-muted">
              Current Option Value ($/contract)
            </label>
            <input
              type="number"
              step="0.01"
              min="0"
              value={value}
              onChange={(e) => setValue(e.target.value)}
              className={inputClass}
            />
            <p className="mt-1 text-[10px] text-terminal-muted">
              Broker-reported current market value or close price per contract
            </p>
          </div>

          <div>
            <label className="text-[10px] uppercase tracking-wider text-terminal-muted">
              Current Value Source
            </label>
            <select
              value={source}
              onChange={(e) =>
                setSource(e.target.value as "manual" | "broker")
              }
              className={inputClass}
            >
              <option value="manual">Manual</option>
              <option value="broker">Broker</option>
            </select>
          </div>

          <div className="rounded-md border border-accent/30 bg-accent/10 px-3 py-2 text-xs">
            <p className="text-terminal-muted">
              Preview close cost:{" "}
              <span className="font-mono text-terminal-text">
                {formatCurrency(preview.closeCost)}
              </span>
            </p>
            <p className="text-terminal-muted">
              Preview P/L:{" "}
              <span
                className={cn(
                  "font-mono",
                  preview.pnl >= 0 ? "text-profit" : "text-loss"
                )}
              >
                {formatSignedCurrency(preview.pnl)}
              </span>
            </p>
          </div>

          <div>
            <label className="text-[10px] uppercase tracking-wider text-terminal-muted">
              Notes
            </label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. Updated from broker mark at close"
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
          Active: {formatValueSourceLabel(trade.currentValueSource)}
          {trade.currentValueUpdatedAt &&
            ` · Updated ${trade.currentValueUpdatedAt.slice(0, 10)}`}
        </p>
      </div>
    </div>
  );
}
