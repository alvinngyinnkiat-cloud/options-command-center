"use client";

import { useState } from "react";
import {
  WATCHLIST_CATEGORIES,
  getCategoryLabel,
  type WatchlistCategory,
} from "@/lib/watchlist/categories";
import { updateWatchlistItem } from "@/app/actions/watchlist";
import { Button } from "@/components/ui/Button";
import type { WatchlistScannerRow } from "@/lib/watchlist/types";

interface WatchlistTickerSettingsProps {
  row: WatchlistScannerRow;
  onUpdated: (rows: WatchlistScannerRow[], dataSource: "supabase" | "mock") => void;
}

export function WatchlistTickerSettings({
  row,
  onUpdated,
}: WatchlistTickerSettingsProps) {
  const [category, setCategory] = useState<WatchlistCategory>(row.category);
  const [priorityRank, setPriorityRank] = useState(String(row.priorityRank));
  const [notes, setNotes] = useState(row.notes ?? "");
  const [isActive, setIsActive] = useState(row.isActive);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    e.stopPropagation();
    setBusy(true);
    setError(null);
    setSaved(false);

    const rank = Number.parseInt(priorityRank, 10);
    const result = await updateWatchlistItem({
      watchlistId: row.watchlistId,
      category,
      priorityRank: Number.isFinite(rank) && rank > 0 ? rank : row.priorityRank,
      notes: notes.trim() || null,
      isActive,
    });

    setBusy(false);
    if (!result.success) {
      setError(result.error);
      return;
    }
    setSaved(true);
    onUpdated(result.rows, result.dataSource);
  }

  return (
    <form
      onSubmit={(e) => void handleSave(e)}
      onClick={(e) => e.stopPropagation()}
      className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4 text-xs border-t border-terminal-border/50 pt-3 mt-2"
    >
      <div>
        <label className="text-[10px] uppercase tracking-wider text-terminal-muted">
          Category
        </label>
        <select
          value={category}
          onChange={(e) => setCategory(e.target.value as WatchlistCategory)}
          className="mt-1 w-full h-8 rounded-md border border-terminal-border bg-terminal-surface px-2 text-xs"
        >
          {WATCHLIST_CATEGORIES.map((cat) => (
            <option key={cat} value={cat}>
              {getCategoryLabel(cat)}
            </option>
          ))}
        </select>
      </div>
      <div>
        <label className="text-[10px] uppercase tracking-wider text-terminal-muted">
          Priority Rank
        </label>
        <input
          type="number"
          min={1}
          value={priorityRank}
          onChange={(e) => setPriorityRank(e.target.value)}
          className="mt-1 w-full h-8 rounded-md border border-terminal-border bg-terminal-surface px-2 font-mono text-xs"
        />
      </div>
      <div>
        <label className="text-[10px] uppercase tracking-wider text-terminal-muted">
          Active
        </label>
        <label className="mt-2 flex items-center gap-2 text-xs">
          <input
            type="checkbox"
            checked={isActive}
            onChange={(e) => setIsActive(e.target.checked)}
          />
          Include in scanner
        </label>
      </div>
      <div className="sm:col-span-2 lg:col-span-4">
        <label className="text-[10px] uppercase tracking-wider text-terminal-muted">
          Notes
        </label>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={2}
          className="mt-1 w-full rounded-md border border-terminal-border bg-terminal-surface px-2 py-1.5 text-xs"
          placeholder="Personal notes for this ticker"
        />
      </div>
      <div className="sm:col-span-2 lg:col-span-4 flex items-center gap-2">
        <Button type="submit" variant="secondary" size="sm" disabled={busy}>
          {busy ? "Saving…" : "Save Settings"}
        </Button>
        {saved && <span className="text-profit text-[11px]">Saved</span>}
        {error && <span className="text-loss text-[11px]">{error}</span>}
      </div>
    </form>
  );
}
