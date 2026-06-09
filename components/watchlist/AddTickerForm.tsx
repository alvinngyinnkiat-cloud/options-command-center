"use client";

import { useState } from "react";
import { addWatchlistTicker } from "@/app/actions/watchlist";
import { Button } from "@/components/ui/Button";
import type { WatchlistCategory } from "@/lib/watchlist/categories";
import type { WatchlistScannerRow } from "@/lib/watchlist/types";
import { Plus } from "lucide-react";

interface AddTickerFormProps {
  category?: WatchlistCategory;
  onAdded: (rows: WatchlistScannerRow[], dataSource: "supabase" | "mock") => void;
}

export function AddTickerForm({
  category = "PULLBACK",
  onAdded,
}: AddTickerFormProps) {
  const [ticker, setTicker] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!ticker.trim()) return;

    setLoading(true);
    setError(null);

    const result = await addWatchlistTicker(ticker, category);
    setLoading(false);

    if (!result.success) {
      setError(result.error);
      return;
    }

    setTicker("");
    onAdded(result.rows, result.dataSource);
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-2 sm:flex-row sm:items-end">
      <div className="flex-1 min-w-[140px]">
        <label
          htmlFor="add-ticker"
          className="text-[10px] uppercase tracking-wider text-terminal-muted"
        >
          Add Ticker
        </label>
        <input
          id="add-ticker"
          type="text"
          value={ticker}
          onChange={(e) => setTicker(e.target.value.toUpperCase())}
          placeholder="e.g. SPY"
          className="mt-1 w-full h-9 rounded-md border border-terminal-border bg-terminal-surface px-3 font-mono text-sm text-terminal-text uppercase placeholder:normal-case placeholder:text-terminal-muted focus:outline-none focus:ring-1 focus:ring-accent/50"
        />
      </div>
      <Button type="submit" variant="primary" size="sm" disabled={loading || !ticker.trim()}>
        <Plus className="h-4 w-4" />
        {loading ? "Adding…" : "Add"}
      </Button>
      {error && <p className="text-xs text-loss sm:col-span-2">{error}</p>}
    </form>
  );
}
