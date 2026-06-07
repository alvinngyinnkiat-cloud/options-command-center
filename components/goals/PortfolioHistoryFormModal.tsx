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
  notes: string;
}

interface PortfolioHistoryFormModalProps {
  record: PortfolioHistoryTableRow | null | undefined;
  onClose: () => void;
  onSaved: (history: PortfolioHistoryData) => void;
}

export function PortfolioHistoryFormModal({
  record,
  onClose,
  onSaved,
}: PortfolioHistoryFormModalProps) {
  const isEdit = record != null && record !== undefined;
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState<PortfolioHistoryFormValues>({
    snapshotDate: record?.snapshotDate ?? new Date().toISOString().slice(0, 10),
    portfolioValueSgd: record?.portfolioValueSgd?.toString() ?? "",
    notes: record?.notes ?? "",
  });

  const inputClass =
    "w-full h-9 rounded-md border border-terminal-border bg-terminal-surface px-3 font-mono text-sm text-terminal-text focus:outline-none focus:ring-1 focus:ring-accent/50";

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    const value = Number(form.portfolioValueSgd);
    if (!form.snapshotDate) {
      setError("Date is required.");
      return;
    }
    if (!Number.isFinite(value) || value <= 0) {
      setError("Enter a valid portfolio value in SGD.");
      return;
    }

    setBusy(true);
    const payload = {
      snapshotDate: form.snapshotDate,
      portfolioValueSgd: value,
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
      <div className="w-full max-w-md rounded-lg border border-terminal-border bg-terminal-bg p-5 shadow-xl">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h3 className="text-sm font-semibold text-terminal-text">
              {isEdit ? "Edit Portfolio Record" : "Add Portfolio Record"}
            </h3>
            <p className="mt-1 text-xs text-terminal-muted">
              One record per date — adding a duplicate date updates the existing
              record.
            </p>
          </div>
          <Button variant="ghost" size="sm" onClick={onClose} aria-label="Close">
            <X className="h-4 w-4" />
          </Button>
        </div>

        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          <div>
            <label
              htmlFor="snapshotDate"
              className="mb-1 block text-[10px] uppercase tracking-wider text-terminal-muted"
            >
              Date
            </label>
            <input
              id="snapshotDate"
              type="date"
              className={inputClass}
              value={form.snapshotDate}
              onChange={(e) =>
                setForm((f) => ({ ...f, snapshotDate: e.target.value }))
              }
              required
            />
          </div>
          <div>
            <label
              htmlFor="portfolioValueSgd"
              className="mb-1 block text-[10px] uppercase tracking-wider text-terminal-muted"
            >
              My Portfolio Value (SGD)
            </label>
            <input
              id="portfolioValueSgd"
              type="number"
              min="0"
              step="0.01"
              className={inputClass}
              value={form.portfolioValueSgd}
              onChange={(e) =>
                setForm((f) => ({ ...f, portfolioValueSgd: e.target.value }))
              }
              required
            />
          </div>
          <div>
            <label
              htmlFor="notes"
              className="mb-1 block text-[10px] uppercase tracking-wider text-terminal-muted"
            >
              Notes
            </label>
            <input
              id="notes"
              className={inputClass}
              value={form.notes}
              onChange={(e) =>
                setForm((f) => ({ ...f, notes: e.target.value }))
              }
              placeholder="Optional"
            />
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
