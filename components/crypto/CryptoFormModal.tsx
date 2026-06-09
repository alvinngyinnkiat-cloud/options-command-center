"use client";

import { useMemo, useState } from "react";
import {
  createCryptoHolding,
  updateCryptoHolding,
} from "@/app/actions/crypto";
import { Button } from "@/components/ui/Button";
import { buildCryptoHoldingMetrics } from "@/lib/crypto/calculations";
import { CRYPTO_ASSET_OPTIONS } from "@/lib/crypto/constants";
import type {
  CryptoAssetLabel,
  CryptoHoldingFormInput,
  EnrichedCryptoHolding,
} from "@/lib/crypto/types";
import { formatSGD, formatSignedSGD } from "@/lib/utils";
import { cn } from "@/lib/utils";
import { X } from "lucide-react";

interface CryptoFormModalProps {
  holding?: EnrichedCryptoHolding | null;
  onClose: () => void;
  onSaved: () => void;
}

function emptyForm(): CryptoHoldingFormInput {
  return {
    assetLabel: "BTC",
    ticker: "BTC",
    totalInvestedSgd: 0,
    currentValueSgd: 0,
    notes: null,
  };
}

function formFromHolding(h: EnrichedCryptoHolding): CryptoHoldingFormInput {
  return {
    assetLabel: h.assetLabel,
    ticker: h.ticker,
    totalInvestedSgd: h.totalInvestedSgd,
    currentValueSgd: h.currentValueSgd,
    notes: h.notes,
  };
}

export function CryptoFormModal({
  holding,
  onClose,
  onSaved,
}: CryptoFormModalProps) {
  const isEdit = Boolean(holding);
  const [form, setForm] = useState<CryptoHoldingFormInput>(
    holding ? formFromHolding(holding) : emptyForm()
  );
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const preview = useMemo(
    () =>
      buildCryptoHoldingMetrics(
        form.totalInvestedSgd,
        form.currentValueSgd,
        form.currentValueSgd
      ),
    [form.totalInvestedSgd, form.currentValueSgd]
  );

  function set<K extends keyof CryptoHoldingFormInput>(
    key: K,
    value: CryptoHoldingFormInput[K]
  ) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  function handleAssetChange(label: CryptoAssetLabel) {
    const opt = CRYPTO_ASSET_OPTIONS.find((o) => o.value === label);
    setForm((f) => ({
      ...f,
      assetLabel: label,
      ticker: label === "Other" ? f.ticker : (opt?.defaultTicker ?? label),
    }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    const result = isEdit
      ? await updateCryptoHolding(
          holding!.id,
          form,
          holding!.createdAt
        )
      : await createCryptoHolding(form);
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
            {isEdit ? "Edit Crypto Holding" : "Add Crypto Holding"}
          </h2>
          <Button variant="ghost" size="sm" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 p-4">
          <p className="text-xs text-terminal-muted">
            Manual SGD values only — no coin quantity or live coin price required.
          </p>

          <div className="grid grid-cols-2 gap-3">
            <label className="space-y-1">
              <span className="text-[10px] uppercase text-terminal-muted">
                Crypto Asset
              </span>
              <select
                className="w-full rounded border border-terminal-border bg-terminal-elevated px-2 py-1.5 text-sm"
                value={form.assetLabel}
                onChange={(e) =>
                  handleAssetChange(e.target.value as CryptoAssetLabel)
                }
              >
                {CRYPTO_ASSET_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="space-y-1">
              <span className="text-[10px] uppercase text-terminal-muted">
                Ticker
              </span>
              <input
                className="w-full rounded border border-terminal-border bg-terminal-elevated px-2 py-1.5 text-sm font-mono"
                value={form.ticker}
                onChange={(e) => set("ticker", e.target.value.toUpperCase())}
                disabled={form.assetLabel !== "Other"}
                required
              />
            </label>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <label className="space-y-1">
              <span className="text-[10px] uppercase text-terminal-muted">
                Total Contributions / Cost (SGD)
              </span>
              <input
                type="number"
                min={0}
                step="0.01"
                className="w-full rounded border border-terminal-border bg-terminal-elevated px-2 py-1.5 text-sm font-mono"
                value={form.totalInvestedSgd}
                onChange={(e) =>
                  set("totalInvestedSgd", parseFloat(e.target.value) || 0)
                }
                required
              />
            </label>
            <label className="space-y-1">
              <span className="text-[10px] uppercase text-terminal-muted">
                Current Value SGD
              </span>
              <input
                type="number"
                min={0}
                step="0.01"
                className="w-full rounded border border-terminal-border bg-terminal-elevated px-2 py-1.5 text-sm font-mono"
                value={form.currentValueSgd}
                onChange={(e) =>
                  set("currentValueSgd", parseFloat(e.target.value) || 0)
                }
                required
              />
            </label>
          </div>

          <label className="block space-y-1">
            <span className="text-[10px] uppercase text-terminal-muted">Notes</span>
            <textarea
              className="w-full rounded border border-terminal-border bg-terminal-elevated px-2 py-1.5 text-sm min-h-[60px]"
              value={form.notes ?? ""}
              onChange={(e) => set("notes", e.target.value || null)}
            />
          </label>

          <div className="rounded-md border border-accent/30 bg-accent/5 grid grid-cols-3 gap-2 p-3 text-xs">
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
              <p
                className={cn(
                  "font-mono font-semibold",
                  preview.returnPct >= 0 ? "text-profit" : "text-loss"
                )}
              >
                {preview.returnPct.toFixed(1)}%
              </p>
            </div>
            <div>
              <p className="text-terminal-muted">Invested</p>
              <p className="font-mono font-semibold">
                {formatSGD(form.totalInvestedSgd)}
              </p>
            </div>
          </div>

          {error && <p className="text-xs text-loss">{error}</p>}

          <div className="flex justify-end gap-2">
            <Button type="button" variant="ghost" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" disabled={saving}>
              {saving ? "Saving…" : isEdit ? "Save" : "Add Holding"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
