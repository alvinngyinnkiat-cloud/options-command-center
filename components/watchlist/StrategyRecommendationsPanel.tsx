import type { WatchlistScannerRow } from "@/lib/watchlist/types";
import { StrategyRecommendationCard } from "./StrategyRecommendationCard";

interface StrategyRecommendationsPanelProps {
  rows: WatchlistScannerRow[];
}

export function StrategyRecommendationsPanel({
  rows,
}: StrategyRecommendationsPanelProps) {
  const scored = rows.filter((r) => r.score);

  if (scored.length === 0) return null;

  return (
    <div>
      <h2 className="mb-3 text-xs font-medium uppercase tracking-wider text-terminal-muted">
        Strategy Recommendations (Phase 6)
      </h2>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {scored.map((row) => (
          <StrategyRecommendationCard
            key={row.watchlistId}
            ticker={row.ticker}
            score={row.score!}
          />
        ))}
      </div>
    </div>
  );
}
