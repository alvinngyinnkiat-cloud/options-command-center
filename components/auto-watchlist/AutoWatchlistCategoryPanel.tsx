import type { AutoWatchlistCategory } from "@/lib/auto-watchlist/types";
import { AutoWatchlistTable } from "./AutoWatchlistTable";

interface AutoWatchlistCategoryPanelProps {
  category: AutoWatchlistCategory;
  manualWatchlistTickers: string[];
  onAdded: () => void;
}

export function AutoWatchlistCategoryPanel({
  category,
  manualWatchlistTickers,
  onAdded,
}: AutoWatchlistCategoryPanelProps) {
  return (
    <section className="rounded-lg border border-terminal-border bg-terminal-surface p-4">
      <div className="mb-3">
        <h2 className="text-sm font-semibold text-terminal-text">
          {category.title}
        </h2>
        <p className="mt-0.5 text-[11px] text-terminal-muted">
          {category.description}
        </p>
        <p className="mt-1 text-[10px] text-terminal-muted">
          {category.entries.length} ticker
          {category.entries.length !== 1 ? "s" : ""}
        </p>
      </div>
      <AutoWatchlistTable
        entries={category.entries}
        manualWatchlistTickers={manualWatchlistTickers}
        onAdded={onAdded}
      />
    </section>
  );
}
