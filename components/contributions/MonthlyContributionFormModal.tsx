"use client";

import { useMemo, useState } from "react";
import {
  createMonthlyContribution,
  updateMonthlyContribution,
} from "@/app/actions/monthly-contributions";
import { Button } from "@/components/ui/Button";
import {
  calculateTotalContribution,
  formatContributionMonthLabel,
} from "@/lib/contributions/calculations";
import type {
  MonthlyContributionRecord,
  MonthlyContributionTrackerData,
} from "@/lib/contributions/types";
import { formatSGD } from "@/lib/utils";
import { X } from "lucide-react";

const MONTH_OPTIONS = [
  { value: 1, label: "January" },
  { value: 2, label: "February" },
  { value: 3, label: "March" },
  { value: 4, label: "April" },
  { value: 5, label: "May" },
  { value: 6, label: "June" },
  { value: 7, label: "July" },
  { value: 8, label: "August" },
  { value: 9, label: "September" },
  { value: 10, label: "October" },
  { value: 11, label: "November" },
  { value: 12, label: "December" },
];

interface MonthlyContributionFormModalProps {
  contribution: MonthlyContributionRecord | null;
  defaultYear: number;
  onClose: () => void;
  onSaved: (data: MonthlyContributionTrackerData) => void;
}

function parseAmount(value: string): number {
  const n = parseFloat(value);
  return isNaN(n) ? 0 : Math.max(0, n);
}

export function MonthlyContributionFormModal({
  contribution,
  defaultYear,
  onClose,
  onSaved,
}: MonthlyContributionFormModalProps) {
  const isEdit = contribution != null;
  const [month, setMonth] = useState(
    String(contribution?.contributionMonth ?? 1)
  );
  const [year, setYear] = useState(
    String(contribution?.contributionYear ?? defaultYear)
  );
  const [stockOptions, setStockOptions] = useState(
    String(contribution?.stockOptionsAmountSgd ?? "")
  );
  const [crypto, setCrypto] = useState(
    String(contribution?.cryptoAmountSgd ?? "")
  );
  const [notes, setNotes] = useState(contribution?.notes ?? "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const total = useMemo(
    () => calculateTotalContribution(parseAmount(stockOptions), parseAmount(crypto)),
    [stockOptions, crypto]
  );

  const inputClass =
    "w-full h-9 rounded-md border border-terminal-border bg-terminal-surface px-3 font-mono text-sm text-terminal-text focus:outline-none focus:ring-1 focus:ring-accent/50";

  async function handleSubmit() {
    setSaving(true);
    setError(null);

    const payload = {
      contributionMonth: parseInt(month, 10),
      contributionYear: parseInt(year, 10),
      stockOptionsAmountSgd: parseAmount(stockOptions),
      cryptoAmountSgd: parseAmount(crypto),
      notes: notes.trim() || null,
    };

    const result = isEdit
      ? await updateMonthlyContribution(
          contribution.id,
          payload,
          contribution.createdAt
        )
      : await createMonthlyContribution(payload);

    setSaving(false);

    if (!result.success) {
      setError(result.error);
      return;
    }

    onSaved(result.data);
    onClose();
  }

  const monthNum = parseInt(month, 10);
  const yearNum = parseInt(year, 10);
  const previewLabel =
    !isNaN(monthNum) && !isNaN(yearNum)
      ? formatContributionMonthLabel(monthNum, yearNum)
      : "—";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="w-full max-w-lg rounded-lg border border-terminal-border bg-terminal-surface shadow-xl">
        <div className="flex items-center justify-between border-b border-terminal-border px-4 py-3">
          <h2 className="text-sm font-medium text-terminal-text">
            {isEdit ? "Edit Month" : "Add Month"}
          </h2>
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
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[10px] uppercase tracking-wider text-terminal-muted">
                Month
              </label>
              <select
                value={month}
                onChange={(e) => setMonth(e.target.value)}
                className={inputClass}
              >
                {MONTH_OPTIONS.map((m) => (
                  <option key={m.value} value={m.value}>
                    {m.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-[10px] uppercase tracking-wider text-terminal-muted">
                Year
              </label>
              <input
                type="number"
                min="2000"
                max="2100"
                value={year}
                onChange={(e) => setYear(e.target.value)}
                className={inputClass}
              />
            </div>
          </div>

          <p className="text-[11px] text-terminal-muted">
            Period: <span className="font-mono text-terminal-text">{previewLabel}</span>
          </p>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[10px] uppercase tracking-wider text-terminal-muted">
                Stocks &amp; Options (SGD)
              </label>
              <input
                type="number"
                min="0"
                step="1"
                value={stockOptions}
                onChange={(e) => setStockOptions(e.target.value)}
                placeholder="0"
                className={inputClass}
              />
              <p className="mt-1 text-[10px] text-terminal-muted">
                US ETF, US Stock, SG Stock, options &amp; investment cash
              </p>
            </div>
            <div>
              <label className="text-[10px] uppercase tracking-wider text-terminal-muted">
                Crypto (SGD)
              </label>
              <input
                type="number"
                min="0"
                step="1"
                value={crypto}
                onChange={(e) => setCrypto(e.target.value)}
                placeholder="0"
                className={inputClass}
              />
              <p className="mt-1 text-[10px] text-terminal-muted">
                BTC, ETH, altcoins, stablecoin deposits
              </p>
            </div>
          </div>

          <div className="rounded-md border border-terminal-border bg-terminal-elevated px-3 py-2">
            <p className="text-[10px] uppercase tracking-wider text-terminal-muted">
              Total Contribution (SGD)
            </p>
            <p className="font-mono text-lg font-semibold text-terminal-text">
              {formatSGD(total)}
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
              placeholder="Optional"
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
            onClick={handleSubmit}
            disabled={saving}
          >
            {saving ? "Saving…" : isEdit ? "Save Changes" : "Add Month"}
          </Button>
        </div>
      </div>
    </div>
  );
}
