"use client";

import { useMemo, useState } from "react";
import {
  createStockEtfHolding,
  updateStockEtfHolding,
} from "@/app/actions/stock-etf";
import { Button } from "@/components/ui/Button";
import { DEFAULT_USD_SGD_RATE } from "@/lib/portfolio/currency";
import { STOCK_ETF_SECTORS } from "@/lib/stocks-etfs/constants";
import { buildStockEtfHoldingMetrics } from "@/lib/stocks-etfs/calculations";
import type {
  EnrichedStockEtfHolding,
  StockEtfHoldingFormInput,
} from "@/lib/stocks-etfs/types";
import { formatSGD, formatSignedSGD } from "@/lib/utils";
import { X } from "lucide-react";

interface StockEtfFormModalProps {
  holding?: EnrichedStockEtfHolding | null;
  onClose: () => void;
  onSaved: () => void;
}

const inputClass =
  "w-full rounded border border-terminal-border bg-terminal-elevated px-3 py-2 text-sm font-mono";

function emptyForm(): StockEtfHoldingFormInput {
  return {
    ticker: "",
    assetType: "stock",
    currency: "SGD",
    sector: "Others",
    totalInvestedNative: 0,
    currentValueNative: 0,
    fxRateToSgd: DEFAULT_USD_SGD_RATE,
    sharesHeld: null,
    averageCost: null,
    notes: null,
  };
}

function formFromHolding(h: EnrichedStockEtfHolding): StockEtfHoldingFormInput {
  return {
    ticker: h.ticker,
    assetType: h.assetType,
    currency: h.currency,
    sector: h.sector,
    totalInvestedNative: h.totalInvestedNative,
    currentValueNative: h.currentValueNative,
    fxRateToSgd: h.fxRateToSgd,
    sharesHeld: h.sharesHeld,
    averageCost: h.averageCost,
    notes: h.notes,
  };
}

export function StockEtfFormModal({
  holding,
  onClose,
  onSaved,
}: StockEtfFormModalProps) {
  const isEdit = Boolean(holding);
  const [form, setForm] = useState<StockEtfHoldingFormInput>(
    holding ? formFromHolding(holding) : emptyForm()
  );
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const preview = useMemo(() => {
    const investedSgd =
      form.currency === "SGD"
        ? form.totalInvestedNative
        : form.totalInvestedNative * form.fxRateToSgd;
    const currentSgd =
      form.currency === "SGD"
        ? form.currentValueNative
        : form.currentValueNative * form.fxRateToSgd;
    return buildStockEtfHoldingMetrics(investedSgd, currentSgd, currentSgd);
  }, [form]);

  function set<K extends keyof StockEtfHoldingFormInput>(
    key: K,
    value: StockEtfHoldingFormInput[K]
  ) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.ticker.trim()) {
      setError("Ticker is required.");
      return;
    }
    setSaving(true);
    setError(null);

    const result = isEdit && holding
      ? await updateStockEtfHolding(holding.id, form, holding.createdAt)
      : await createStockEtfHolding(form);

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
      <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-lg border border-terminal-border bg-terminal-surface p-5 shadow-xl">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-terminal-text">
            {isEdit ? "Edit Holding" : "Add Stock / ETF"}
          </h2>
          <button type="button" onClick={onClose} aria-label="Close">
            <X className="h-4 w-4 text-terminal-muted" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <label className="space-y-1">
              <span className="text-[10px] uppercase text-terminal-muted">Ticker</span>
              <input
                className={inputClass}
                value={form.ticker}
                onChange={(e) => set("ticker", e.target.value.toUpperCase())}
              />
            </label>
            <label className="space-y-1">
              <span className="text-[10px] uppercase text-terminal-muted">Asset Type</span>
              <select
                className={inputClass}
                value={form.assetType}
                onChange={(e) =>
                  set("assetType", e.target.value as StockEtfHoldingFormInput["assetType"])
                }
              >
                <option value="stock">Stock</option>
                <option value="etf">ETF</option>
              </select>
            </label>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <label className="space-y-1">
              <span className="text-[10px] uppercase text-terminal-muted">Currency</span>
              <select
                className={inputClass}
                value={form.currency}
                onChange={(e) =>
                  set("currency", e.target.value as StockEtfHoldingFormInput["currency"])
                }
              >
                <option value="SGD">SGD</option>
                <option value="USD">USD</option>
              </select>
            </label>
            <label className="space-y-1">
              <span className="text-[10px] uppercase text-terminal-muted">Sector</span>
              <select
                className={inputClass}
                value={form.sector}
                onChange={(e) =>
                  set("sector", e.target.value as StockEtfHoldingFormInput["sector"])
                }
              >
                {STOCK_ETF_SECTORS.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <label className="space-y-1">
              <span className="text-[10px] uppercase text-terminal-muted">
                Capital Invested ({form.currency})
              </span>
              <input
                type="number"
                step="0.01"
                className={inputClass}
                value={form.totalInvestedNative || ""}
                onChange={(e) =>
                  set("totalInvestedNative", parseFloat(e.target.value) || 0)
                }
              />
            </label>
            <label className="space-y-1">
              <span className="text-[10px] uppercase text-terminal-muted">
                Current Value ({form.currency})
              </span>
              <input
                type="number"
                step="0.01"
                className={inputClass}
                value={form.currentValueNative || ""}
                onChange={(e) =>
                  set("currentValueNative", parseFloat(e.target.value) || 0)
                }
              />
            </label>
          </div>

          {form.currency === "USD" && (
            <label className="space-y-1">
              <span className="text-[10px] uppercase text-terminal-muted">
                USD → SGD Rate
              </span>
              <input
                type="number"
                step="0.0001"
                className={inputClass}
                value={form.fxRateToSgd}
                onChange={(e) =>
                  set("fxRateToSgd", parseFloat(e.target.value) || DEFAULT_USD_SGD_RATE)
                }
              />
            </label>
          )}

          <p className="rounded border border-terminal-border bg-terminal-elevated/30 px-3 py-2 text-[11px] text-terminal-muted">
            Dividend income is managed in{" "}
            <a href="/dividends" className="text-accent hover:underline">
              Dividend Tracker
            </a>{" "}
            and syncs automatically to this view.
          </p>

          <div className="grid grid-cols-2 gap-3">
            <label className="space-y-1">
              <span className="text-[10px] uppercase text-terminal-muted">
                Shares Held (optional)
              </span>
              <input
                type="number"
                step="0.0001"
                className={inputClass}
                value={form.sharesHeld ?? ""}
                onChange={(e) =>
                  set(
                    "sharesHeld",
                    e.target.value ? parseFloat(e.target.value) : null
                  )
                }
              />
            </label>
            <label className="space-y-1">
              <span className="text-[10px] uppercase text-terminal-muted">
                Avg Cost (optional)
              </span>
              <input
                type="number"
                step="0.0001"
                className={inputClass}
                value={form.averageCost ?? ""}
                onChange={(e) =>
                  set(
                    "averageCost",
                    e.target.value ? parseFloat(e.target.value) : null
                  )
                }
              />
            </label>
          </div>

          <label className="block space-y-1">
            <span className="text-[10px] uppercase text-terminal-muted">Notes</span>
            <textarea
              className={`${inputClass} min-h-[60px]`}
              value={form.notes ?? ""}
              onChange={(e) => set("notes", e.target.value.trim() || null)}
            />
          </label>

          <div className="rounded border border-terminal-border bg-terminal-elevated/30 px-3 py-2 text-xs">
            <p className="text-terminal-muted">
              Preview (SGD): P/L {formatSignedSGD(preview.profitLossSgd)} · Return{" "}
              {preview.returnPct.toFixed(1)}% · Value {formatSGD(preview.currentValueSgd)}
            </p>
          </div>

          {error && <p className="text-xs text-loss">{error}</p>}

          <div className="flex justify-end gap-2 pt-1">
            <Button type="button" variant="ghost" size="sm" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" size="sm" disabled={saving}>
              {saving ? "Saving…" : isEdit ? "Update" : "Add Holding"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
