"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import {
  createDailyPortfolioRecord,
  updateDailyPortfolioRecord,
} from "@/app/actions/daily-portfolio-records";
import type { PortfolioHistoryData } from "@/lib/portfolio/daily-snapshot-types";
import type { PortfolioHistoryTableRow } from "@/lib/portfolio/daily-snapshot-types";
import { X } from "lucide-react";

export interface PortfolioHistoryFormValues {
  snapshotDate: string;
  portfolioValueSgd: string;
  clientCurrentValueSgd: string;
  tradingCashUsd: string;
  tradingCashSgd: string;
  cryptoCashSgd: string;
  cryptoValueSgd: string;
  notes: string;
}

interface PortfolioHistoryFormModalProps {
  record: PortfolioHistoryTableRow | null | undefined;
  defaults?: Partial<PortfolioHistoryFormValues>;
  onClose: () => void;
  onSaved: (history: PortfolioHistoryData) => void;
}

export function PortfolioHistoryFormModal({
  record,
  defaults,
  onClose,
  onSaved,
}: PortfolioHistoryFormModalProps) {
  const isEdit = record != null && record !== undefined;
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState<PortfolioHistoryFormValues>({
    snapshotDate: record?.snapshotDate ?? new Date().toISOString().slice(0, 10),
    portfolioValueSgd: record?.portfolioValueSgd?.toString() ?? defaults?.portfolioValueSgd ?? "",
    clientCurrentValueSgd: defaults?.clientCurrentValueSgd ?? "",
    tradingCashUsd: defaults?.tradingCashUsd ?? "",
    tradingCashSgd: defaults?.tradingCashSgd ?? "",
    cryptoCashSgd: defaults?.cryptoCashSgd ?? "",
    cryptoValueSgd: defaults?.cryptoValueSgd ?? "",
    notes: record?.notes ?? "",
  });

  const inputClass =
    "w-full h-9 rounded-md border border-terminal-border bg-terminal-surface px-3 font-mono text-sm text-terminal-text focus:outline-none focus:ring-1 focus:ring-accent/50";

  function parseRequired(value: string, label: string): number | null {
    const n = Number(value);
    if (!Number.isFinite(n) || n < 0) {
      setError(`Enter a valid ${label}.`);
      return null;
    }
    return n;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!form.snapshotDate) {
      setError("Date is required.");
      return;
    }

    const portfolioValueSgd = parseRequired(form.portfolioValueSgd, "portfolio value");
    const clientCurrentValueSgd = parseRequired(form.clientCurrentValueSgd, "client current value");
    const tradingCashUsd = parseRequired(form.tradingCashUsd, "trading cash USD");
    const tradingCashSgd = parseRequired(form.tradingCashSgd, "trading cash SGD");
    const cryptoCashSgd = parseRequired(form.cryptoCashSgd, "crypto cash SGD");
    const cryptoValueSgd = parseRequired(form.cryptoValueSgd, "crypto value SGD");
    if (
      portfolioValueSgd == null ||
      clientCurrentValueSgd == null ||
      tradingCashUsd == null ||
      tradingCashSgd == null ||
      cryptoCashSgd == null ||
      cryptoValueSgd == null
    ) {
      return;
    }

    setBusy(true);
    const payload = {
      snapshotDate: form.snapshotDate,
      portfolioValueSgd,
      clientCurrentValueSgd,
      tradingCashUsd,
      tradingCashSgd,
      cryptoCashSgd,
      cryptoValueSgd,
      notes: form.notes.trim() || null,
    };

    const result = isEdit
      ? await updateDailyPortfolioRecord(record!.id, payload)
      : await createDailyPortfolioRecord(payload);

    setBusy(false);

    if (!result.success) {
      setError(result.error);
      return;
    }

    onSaved(result.history);
    onClose();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-lg border border-terminal-border bg-terminal-bg p-5 shadow-xl">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h3 className="text-sm font-semibold text-terminal-text">
              {isEdit ? "Edit Portfolio Record" : "Add Portfolio Record"}
            </h3>
            <p className="mt-1 text-xs text-terminal-muted">
              Manual snapshot fields. Trading Cash SGD is used for capital
              calculations; USD cash is stored for reference only.
            </p>
          </div>
          <Button variant="ghost" size="sm" onClick={onClose} aria-label="Close">
            <X className="h-4 w-4" />
          </Button>
        </div>

        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          <div>
            <label htmlFor="snapshotDate" className="mb-1 block text-[10px] uppercase tracking-wider text-terminal-muted">
              Date
            </label>
            <input id="snapshotDate" type="date" className={inputClass} value={form.snapshotDate} onChange={(e) => setForm((f) => ({ ...f, snapshotDate: e.target.value }))} required />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="portfolioValueSgd" className="mb-1 block text-[10px] uppercase tracking-wider text-terminal-muted">
                My Portfolio Value (SGD)
              </label>
              <input id="portfolioValueSgd" type="number" min="0" step="0.01" className={inputClass} value={form.portfolioValueSgd} onChange={(e) => setForm((f) => ({ ...f, portfolioValueSgd: e.target.value }))} required />
            </div>
            <div>
              <label htmlFor="clientCurrentValueSgd" className="mb-1 block text-[10px] uppercase tracking-wider text-terminal-muted">
                Client Current Value (SGD)
              </label>
              <input id="clientCurrentValueSgd" type="number" min="0" step="0.01" className={inputClass} value={form.clientCurrentValueSgd} onChange={(e) => setForm((f) => ({ ...f, clientCurrentValueSgd: e.target.value }))} required />
            </div>
            <div>
              <label htmlFor="tradingCashUsd" className="mb-1 block text-[10px] uppercase tracking-wider text-terminal-muted">
                Trading Cash USD
              </label>
              <input id="tradingCashUsd" type="number" min="0" step="0.01" className={inputClass} value={form.tradingCashUsd} onChange={(e) => setForm((f) => ({ ...f, tradingCashUsd: e.target.value }))} required />
            </div>
            <div>
              <label htmlFor="tradingCashSgd" className="mb-1 block text-[10px] uppercase tracking-wider text-terminal-muted">
                Trading Cash SGD
              </label>
              <input id="tradingCashSgd" type="number" min="0" step="0.01" className={inputClass} value={form.tradingCashSgd} onChange={(e) => setForm((f) => ({ ...f, tradingCashSgd: e.target.value }))} required />
            </div>
            <div>
              <label htmlFor="cryptoCashSgd" className="mb-1 block text-[10px] uppercase tracking-wider text-terminal-muted">
                Crypto Cash SGD
              </label>
              <input id="cryptoCashSgd" type="number" min="0" step="0.01" className={inputClass} value={form.cryptoCashSgd} onChange={(e) => setForm((f) => ({ ...f, cryptoCashSgd: e.target.value }))} required />
            </div>
            <div>
              <label htmlFor="cryptoValueSgd" className="mb-1 block text-[10px] uppercase tracking-wider text-terminal-muted">
                Crypto Value SGD
              </label>
              <input id="cryptoValueSgd" type="number" min="0" step="0.01" className={inputClass} value={form.cryptoValueSgd} onChange={(e) => setForm((f) => ({ ...f, cryptoValueSgd: e.target.value }))} required />
            </div>
          </div>
          <div>
            <label htmlFor="notes" className="mb-1 block text-[10px] uppercase tracking-wider text-terminal-muted">
              Notes
            </label>
            <input id="notes" className={inputClass} value={form.notes} onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))} placeholder="Optional" />
          </div>

          {error && (
            <p className="text-xs text-loss" role="alert">
              {error}
            </p>
          )}

          <div className="flex justify-end gap-2">
            <Button type="button" variant="ghost" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" disabled={busy}>
              {busy ? "Saving…" : isEdit ? "Save Changes" : "Add Record"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
