"use client";

import { useMemo, useState } from "react";
import {
  createStockEtfHolding,
  updateStockEtfHolding,
} from "@/app/actions/stock-etf";
import { Button } from "@/components/ui/Button";
import { DEFAULT_USD_SGD_RATE } from "@/lib/portfolio/currency";
import { STOCK_ETF_SECTORS } from "@/lib/stocks-etfs/constants";
import { calculateManualPositionMetrics } from "@/lib/stocks-etfs/manual-position";
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
    manualTotalDividend: 0,
    manualTotalFees: 0,
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
    manualTotalDividend: h.manualTotalDividend,
    manualTotalFees: h.manualTotalFees,
    notes: h.notes,
  };
}

export function StockEtfFormModal({
  holding,
  onClose,
  onSaved,
}: StockEtfFormModalProps) {
  const isEdit = Boolean(holding);
  const isManual = !holding || holding.trackingMode === "manual";
  const [form, setForm] = useState<StockEtfHoldingFormInput>(
    holding ? formFromHolding(holding) : emptyForm()
  );
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const preview = useMemo(() => {
    if (!isManual) return null;
    return calculateManualPositionMetrics({
      currentValue: form.currentValueNative,
      capitalInvested: form.totalInvestedNative,
      totalDividend: form.manualTotalDividend,
      totalFees: form.manualTotalFees,
    });
  }, [form, isManual]);

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
    if (isManual && (form.sharesHeld == null || form.sharesHeld <= 0)) {
      setError("Shares are required in Manual Position mode.");
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

  if (!isManual) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
        <div className="w-full max-w-md rounded-lg border border-terminal-border bg-terminal-surface p-5 shadow-xl">
          <p className="text-sm text-terminal-text">
            This position uses Transaction Accounting mode. Edit via buy/sell
            transactions or use &ldquo;Switch to Transaction Mode&rdquo; from a
            manual position first.
          </p>
          <div className="mt-4 flex justify-end">
            <Button variant="ghost" size="sm" onClick={onClose}>
              Close
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-lg border border-terminal-border bg-terminal-surface p-5 shadow-xl">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h2 className="text-sm font-semibold text-terminal-text">
              {isEdit ? "Edit Manual Position" : "Add Manual Position"}
            </h2>
            <p className="text-[11px] text-terminal-muted">
              Manual Position mode — no buy/sell history required
            </p>
          </div>
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

          <label className="block space-y-1">
            <span className="text-[10px] uppercase text-terminal-muted">Shares</span>
            <input
              type="number"
              step="0.0001"
              required
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

          <div className="grid grid-cols-2 gap-3">
            <label className="space-y-1">
              <span className="text-[10px] uppercase text-terminal-muted">
                Total Dividend ({form.currency})
              </span>
              <input
                type="number"
                step="0.01"
                className={inputClass}
                value={form.manualTotalDividend || ""}
                onChange={(e) =>
                  set("manualTotalDividend", parseFloat(e.target.value) || 0)
                }
              />
            </label>
            <label className="space-y-1">
              <span className="text-[10px] uppercase text-terminal-muted">
                Total Fees ({form.currency})
              </span>
              <input
                type="number"
                step="0.01"
                className={inputClass}
                value={form.manualTotalFees || ""}
                onChange={(e) =>
                  set("manualTotalFees", parseFloat(e.target.value) || 0)
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

          <label className="block space-y-1">
            <span className="text-[10px] uppercase text-terminal-muted">Notes</span>
            <textarea
              className={`${inputClass} min-h-[60px]`}
              value={form.notes ?? ""}
              onChange={(e) => set("notes", e.target.value.trim() || null)}
            />
          </label>

          {preview && (
            <div className="rounded border border-terminal-border bg-terminal-elevated/30 px-3 py-2 text-xs space-y-1">
              <p className="text-terminal-muted">
                Asset P/L: {formatSignedSGD(preview.assetPl)} · ROI{" "}
                {preview.roiPct.toFixed(1)}%
              </p>
              <p className="text-terminal-muted">
                P/L incl. dividend: {formatSignedSGD(preview.plIncludingDividend)}
              </p>
            </div>
          )}

          {error && <p className="text-xs text-loss">{error}</p>}

          <div className="flex justify-end gap-2 pt-1">
            <Button type="button" variant="ghost" size="sm" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" size="sm" disabled={saving}>
              {saving ? "Saving…" : isEdit ? "Update" : "Add Position"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
