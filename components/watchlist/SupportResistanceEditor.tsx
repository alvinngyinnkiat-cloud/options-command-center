"use client";

import { useState } from "react";
import { saveSupportResistance } from "@/app/actions/watchlist";
import { Button } from "@/components/ui/Button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/Card";
import type { WatchlistScannerRow } from "@/lib/watchlist/types";
import { X } from "lucide-react";

interface SupportResistanceEditorProps {
  row: WatchlistScannerRow;
  onClose: () => void;
  onSaved: (rows: WatchlistScannerRow[], dataSource: "supabase" | "mock") => void;
}

function parseLevel(value: string): number | null {
  const trimmed = value.trim();
  if (!trimmed) return null;
  const parsed = parseFloat(trimmed);
  return isNaN(parsed) ? null : parsed;
}

export function SupportResistanceEditor({
  row,
  onClose,
  onSaved,
}: SupportResistanceEditorProps) {
  const sr = row.supportResistance;
  const [support1, setSupport1] = useState(sr.support1?.toString() ?? "");
  const [support2, setSupport2] = useState(sr.support2?.toString() ?? "");
  const [resistance1, setResistance1] = useState(sr.resistance1?.toString() ?? "");
  const [resistance2, setResistance2] = useState(sr.resistance2?.toString() ?? "");
  const [notes, setNotes] = useState(sr.notes ?? "");
  const [updateDate, setUpdateDate] = useState(sr.updateDate);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSave() {
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
      updateDate,
      timeframe: "daily",
    });

    setSaving(false);

    if (!result.success) {
      setError(result.error);
      return;
    }

    onSaved(result.rows, result.dataSource);
    onClose();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
      <Card variant="elevated" className="w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <CardHeader>
          <div className="flex items-start justify-between gap-2">
            <div>
              <CardTitle>
                Edit S/R — {row.ticker}
              </CardTitle>
              <CardDescription>
                Manual input only. Daily major support and resistance levels.
              </CardDescription>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="rounded p-1.5 text-terminal-muted hover:bg-terminal-elevated hover:text-terminal-text"
              aria-label="Close"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <LevelInput label="Major Support 1" value={support1} onChange={setSupport1} />
            <LevelInput label="Major Support 2" value={support2} onChange={setSupport2} />
            <LevelInput label="Major Resistance 1" value={resistance1} onChange={setResistance1} />
            <LevelInput label="Major Resistance 2" value={resistance2} onChange={setResistance2} />
          </div>

          <div>
            <label className="text-[10px] uppercase tracking-wider text-terminal-muted">
              Update Date
            </label>
            <input
              type="date"
              value={updateDate}
              onChange={(e) => setUpdateDate(e.target.value)}
              className="mt-1 w-full h-9 rounded-md border border-terminal-border bg-terminal-surface px-3 text-sm text-terminal-text focus:outline-none focus:ring-1 focus:ring-accent/50"
            />
          </div>

          <div>
            <label className="text-[10px] uppercase tracking-wider text-terminal-muted">
              Notes
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              placeholder="Manual notes on major daily/weekly levels..."
              className="mt-1 w-full rounded-md border border-terminal-border bg-terminal-surface px-3 py-2 text-sm text-terminal-text placeholder:text-terminal-muted focus:outline-none focus:ring-1 focus:ring-accent/50 resize-none"
            />
          </div>

          <p className="text-[11px] text-terminal-muted border-t border-terminal-border pt-3">
            Levels are never auto-generated. You enter and save them manually per PROJECT_RULES.md.
          </p>

          {error && (
            <p className="text-xs text-loss">{error}</p>
          )}

          <div className="flex justify-end gap-2">
            <Button variant="ghost" size="sm" onClick={onClose}>
              Cancel
            </Button>
            <Button variant="primary" size="sm" onClick={handleSave} disabled={saving}>
              {saving ? "Saving…" : "Save S/R"}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function LevelInput({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div>
      <label className="text-[10px] uppercase tracking-wider text-terminal-muted">
        {label}
      </label>
      <input
        type="number"
        step="0.01"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Manual entry"
        className="mt-1 w-full h-9 rounded-md border border-terminal-border bg-terminal-surface px-3 font-mono text-sm text-terminal-text placeholder:text-terminal-muted focus:outline-none focus:ring-1 focus:ring-accent/50"
      />
    </div>
  );
}
