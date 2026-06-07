"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import {
  createDividend,
  updateDividend,
} from "@/app/actions/dividend-records";
import type { DividendFormInput, DividendRecordView } from "@/lib/dividends/types";
import type { DividendTrackerData } from "@/lib/dividends/types";
import type {
  DividendCategory,
  DividendMarket,
  DividendSource,
  DividendStatus,
} from "@/types/database";
import { X } from "lucide-react";

const CATEGORIES: DividendCategory[] = [
  "us_etf",
  "us_stock",
  "sg_stock",
  "sg_reit",
];

function emptyForm(): DividendFormInput {
  return {
    ticker: "",
    market: "US",
    category: "us_stock",
    exDividendDate: null,
    recordDate: null,
    paymentDate: new Date().toISOString().slice(0, 10),
    dividendPerShare: 0,
    sharesHeld: 0,
    withholdingTax: 0,
    currency: "USD",
    fxRateToSgd: 1.35,
    source: "manual",
    status: "received",
    isReceived: true,
    notes: null,
  };
}

function formFromRecord(record: DividendRecordView): DividendFormInput {
  return {
    ticker: record.ticker,
    market: record.market,
    category: record.category,
    exDividendDate: record.exDividendDate,
    recordDate: record.recordDate,
    paymentDate: record.paymentDate,
    dividendPerShare: record.dividendPerShare,
    sharesHeld: record.sharesHeld,
    grossDividend: record.grossDividend,
    withholdingTax: record.withholdingTax,
    netDividend: record.netDividend,
    currency: record.currency,
    sgdEquivalent: record.sgdEquivalent,
    fxRateToSgd: record.fxRateToSgd,
    source: record.source,
    status: record.status,
    isReceived: record.isReceived,
    notes: record.notes,
    holdingId: record.holdingId,
  };
}

interface DividendFormModalProps {
  record: DividendRecordView | null | undefined;
  onClose: () => void;
  onSaved: (data: DividendTrackerData) => void;
}

export function DividendFormModal({
  record,
  onClose,
  onSaved,
}: DividendFormModalProps) {
  const isEdit = record != null && record !== undefined;
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState<DividendFormInput>(
    isEdit ? formFromRecord(record) : emptyForm()
  );

  const inputClass =
    "w-full h-9 rounded-md border border-terminal-border bg-terminal-surface px-3 text-sm text-terminal-text focus:outline-none focus:ring-1 focus:ring-accent/50";
  const labelClass =
    "text-[10px] uppercase tracking-wider text-terminal-muted";

  function set<K extends keyof DividendFormInput>(
    key: K,
    value: DividendFormInput[K]
  ) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!form.ticker.trim()) {
      setError("Ticker is required.");
      return;
    }

    setBusy(true);
    const result = isEdit
      ? await updateDividend(record!.id, form)
      : await createDividend(form);
    setBusy(false);

    if (!result.success) {
      setError(result.error);
      return;
    }
    onSaved(result.data);
    onClose();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="w-full max-w-2xl rounded-lg border border-terminal-border bg-terminal-bg p-5 shadow-xl max-h-[90vh] overflow-y-auto">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold">
            {isEdit ? "Edit Dividend" : "Add Dividend"}
          </h2>
          <Button variant="ghost" size="sm" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <div>
              <label className={labelClass}>Ticker</label>
              <input
                className={`${inputClass} font-mono`}
                value={form.ticker}
                onChange={(e) => set("ticker", e.target.value.toUpperCase())}
              />
            </div>
            <div>
              <label className={labelClass}>Market</label>
              <select
                className={inputClass}
                value={form.market}
                onChange={(e) => set("market", e.target.value as DividendMarket)}
              >
                <option value="US">US</option>
                <option value="SG">SG</option>
              </select>
            </div>
            <div className="col-span-2">
              <label className={labelClass}>Category</label>
              <select
                className={inputClass}
                value={form.category}
                onChange={(e) =>
                  set("category", e.target.value as DividendCategory)
                }
              >
                {CATEGORIES.map((c) => (
                  <option key={c} value={c}>
                    {c.replace("_", " ")}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className={labelClass}>Ex-Dividend Date</label>
              <input
                type="date"
                className={inputClass}
                value={form.exDividendDate ?? ""}
                onChange={(e) =>
                  set("exDividendDate", e.target.value || null)
                }
              />
            </div>
            <div>
              <label className={labelClass}>Record Date</label>
              <input
                type="date"
                className={inputClass}
                value={form.recordDate ?? ""}
                onChange={(e) => set("recordDate", e.target.value || null)}
              />
            </div>
            <div>
              <label className={labelClass}>Payment Date</label>
              <input
                type="date"
                className={inputClass}
                value={form.paymentDate ?? ""}
                onChange={(e) => set("paymentDate", e.target.value || null)}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <div>
              <label className={labelClass}>Div / Share</label>
              <input
                type="number"
                step="0.0001"
                className={`${inputClass} font-mono`}
                value={form.dividendPerShare || ""}
                onChange={(e) =>
                  set("dividendPerShare", parseFloat(e.target.value) || 0)
                }
              />
            </div>
            <div>
              <label className={labelClass}>Shares Held</label>
              <input
                type="number"
                className={`${inputClass} font-mono`}
                value={form.sharesHeld || ""}
                onChange={(e) =>
                  set("sharesHeld", parseFloat(e.target.value) || 0)
                }
              />
            </div>
            <div>
              <label className={labelClass}>Withholding Tax</label>
              <input
                type="number"
                className={`${inputClass} font-mono`}
                value={form.withholdingTax || ""}
                onChange={(e) =>
                  set("withholdingTax", parseFloat(e.target.value) || 0)
                }
              />
            </div>
            <div>
              <label className={labelClass}>SGD Equivalent</label>
              <input
                type="number"
                className={`${inputClass} font-mono`}
                value={form.sgdEquivalent ?? ""}
                onChange={(e) =>
                  set("sgdEquivalent", parseFloat(e.target.value) || 0)
                }
                placeholder="Auto if blank"
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className={labelClass}>Currency</label>
              <select
                className={inputClass}
                value={form.currency}
                onChange={(e) => set("currency", e.target.value)}
              >
                <option value="USD">USD</option>
                <option value="SGD">SGD</option>
              </select>
            </div>
            <div>
              <label className={labelClass}>Source</label>
              <select
                className={inputClass}
                value={form.source}
                onChange={(e) => set("source", e.target.value as DividendSource)}
              >
                <option value="manual">Manual</option>
                <option value="broker">Broker</option>
                <option value="api">API</option>
              </select>
            </div>
            <div>
              <label className={labelClass}>Status</label>
              <select
                className={inputClass}
                value={form.status}
                onChange={(e) => set("status", e.target.value as DividendStatus)}
              >
                <option value="received">Received</option>
                <option value="upcoming">Upcoming</option>
                <option value="estimated">Estimated</option>
              </select>
            </div>
          </div>

          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={form.isReceived}
              onChange={(e) => set("isReceived", e.target.checked)}
            />
            Mark as received
          </label>

          <div>
            <label className={labelClass}>Notes</label>
            <textarea
              className={`${inputClass} h-16 py-2 resize-none`}
              value={form.notes ?? ""}
              onChange={(e) => set("notes", e.target.value || null)}
            />
          </div>

          {error && <p className="text-sm text-loss">{error}</p>}

          <div className="flex justify-end gap-2">
            <Button type="button" variant="ghost" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" disabled={busy}>
              {busy ? "Saving…" : isEdit ? "Save" : "Add Dividend"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
