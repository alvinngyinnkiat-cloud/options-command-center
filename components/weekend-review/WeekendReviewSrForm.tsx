"use client";

import { useState } from "react";
import { saveSupportResistance } from "@/app/actions/watchlist";
import { Button } from "@/components/ui/Button";
import type { WatchlistScannerRow } from "@/lib/watchlist/types";

interface WeekendReviewSrFormProps {
  rows: WatchlistScannerRow[];
  selectedWatchlistId?: string | null;
  onSaved: (rows: WatchlistScannerRow[], dataSource: "supabase" | "mock") => void;
}

function parseLevel(value: string): number | null {
  const trimmed = value.trim();
  if (!trimmed) return null;
  const parsed = parseFloat(trimmed);
  return isNaN(parsed) ? null : parsed;
}

const inputClass =
  "w-full rounded border border-terminal-border bg-terminal-elevated px-3 py-2 text-sm font-mono";

export function WeekendReviewSrForm({
  rows,
  selectedWatchlistId,
  onSaved,
}: WeekendReviewSrFormProps) {
  const [tickerId, setTickerId] = useState(
    selectedWatchlistId ?? rows[0]?.watchlistId ?? ""
  );
  const row = rows.find((r) => r.watchlistId === tickerId) ?? rows[0];
  const sr = row?.supportResistance;

  const [support1, setSupport1] = useState(sr?.support1?.toString() ?? "");
  const [support2, setSupport2] = useState(sr?.support2?.toString() ?? "");
  const [resistance1, setResistance1] = useState(sr?.resistance1?.toString() ?? "");
  const [resistance2, setResistance2] = useState(sr?.resistance2?.toString() ?? "");
  const [notes, setNotes] = useState(sr?.notes ?? "");
  const [reviewDate, setReviewDate] = useState(
    sr?.updateDate ?? new Date().toISOString().split("T")[0]
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function loadRow(watchlistId: string) {
    const next = rows.find((r) => r.watchlistId === watchlistId);
    if (!next) return;
    setTickerId(watchlistId);
    setSupport1(next.supportResistance.support1?.toString() ?? "");
    setSupport2(next.supportResistance.support2?.toString() ?? "");
    setResistance1(next.supportResistance.resistance1?.toString() ?? "");
    setResistance2(next.supportResistance.resistance2?.toString() ?? "");
    setNotes(next.supportResistance.notes ?? "");
    setReviewDate(next.supportResistance.updateDate);
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!row) return;
    setSaving(true);
    setError(null);

    const result = await saveSupportResistance({
      watchlistId: row.watchlistId,
      ticker: row.ticker,
      support1: parseLevel(support1),
      support2: parseLevel(support2),
      resistance1: parseLevel(resistance1),
      resistance2: parseLevel(resistance2),
      notes: notes.trim() || null,
      updateDate: reviewDate,
      timeframe: "daily",
    });

    setSaving(false);
    if (!result.success) {
      setError(result.error);
      return;
    }
    onSaved(result.rows, result.dataSource);
  }

  if (!row) return null;

  return (
    <form
      onSubmit={handleSave}
      className="rounded-lg border border-terminal-border bg-terminal-surface p-4 space-y-4"
    >
      <div>
        <h3 className="text-xs font-medium uppercase tracking-wider text-terminal-muted">
          Manual Support / Resistance Update
        </h3>
        <p className="mt-1 text-[11px] text-warning">
          You must manually enter all levels. The app never calculates or suggests
          support/resistance.
        </p>
      </div>

      <label className="block space-y-1">
        <span className="text-[10px] uppercase text-terminal-muted">Ticker</span>
        <select
          className={inputClass}
          value={tickerId}
          onChange={(e) => loadRow(e.target.value)}
        >
          {rows.map((r) => (
            <option key={r.watchlistId} value={r.watchlistId}>
              {r.ticker}
            </option>
          ))}
        </select>
      </label>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <label className="space-y-1">
          <span className="text-[10px] uppercase text-terminal-muted">Support 1</span>
          <input className={inputClass} value={support1} onChange={(e) => setSupport1(e.target.value)} />
        </label>
        <label className="space-y-1">
          <span className="text-[10px] uppercase text-terminal-muted">Support 2</span>
          <input className={inputClass} value={support2} onChange={(e) => setSupport2(e.target.value)} />
        </label>
        <label className="space-y-1">
          <span className="text-[10px] uppercase text-terminal-muted">Resistance 1</span>
          <input className={inputClass} value={resistance1} onChange={(e) => setResistance1(e.target.value)} />
        </label>
        <label className="space-y-1">
          <span className="text-[10px] uppercase text-terminal-muted">Resistance 2</span>
          <input className={inputClass} value={resistance2} onChange={(e) => setResistance2(e.target.value)} />
        </label>
      </div>

      <label className="block space-y-1">
        <span className="text-[10px] uppercase text-terminal-muted">Notes</span>
        <textarea
          className={`${inputClass} min-h-[72px]`}
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
        />
      </label>

      <label className="block space-y-1 max-w-xs">
        <span className="text-[10px] uppercase text-terminal-muted">Review Date</span>
        <input
          type="date"
          className={inputClass}
          value={reviewDate}
          onChange={(e) => setReviewDate(e.target.value)}
        />
      </label>

      {error && <p className="text-xs text-loss">{error}</p>}

      <Button type="submit" variant="primary" size="sm" disabled={saving}>
        {saving ? "Saving…" : "Save Manual S/R"}
      </Button>
    </form>
  );
}
