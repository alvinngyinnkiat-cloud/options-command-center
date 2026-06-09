"use client";

import { useMemo, useState } from "react";
import { Button } from "@/components/ui/Button";
import { buildTradingAnalysisViewModel } from "@/lib/watchlist/analysis-card";
import { sortRowsByWatchlistRank } from "@/lib/watchlist/watchlist-rank";
import type { WatchlistScannerRow } from "@/lib/watchlist/types";
import type { WeekendReviewStatus } from "@/lib/weekend-review/types";
import { TradingAnalysisCard } from "./TradingAnalysisCard";

interface TradingAnalysisPanelProps {
  rows: WatchlistScannerRow[];
  reviewStatus: WeekendReviewStatus;
}

type SortKey = "rank" | "score" | "ticker";

export function TradingAnalysisPanel({
  rows,
  reviewStatus,
}: TradingAnalysisPanelProps) {
  const [sortKey, setSortKey] = useState<SortKey>("rank");
  const [selectedTicker, setSelectedTicker] = useState<string | "all">("all");

  const models = useMemo(() => {
    const built = sortRowsByWatchlistRank(rows).map((row) =>
      buildTradingAnalysisViewModel(row, reviewStatus)
    );
    if (sortKey === "score") {
      return [...built].sort(
        (a, b) => (b.totalScore ?? 0) - (a.totalScore ?? 0)
      );
    }
    if (sortKey === "ticker") {
      return [...built].sort((a, b) => a.ticker.localeCompare(b.ticker));
    }
    return built;
  }, [rows, reviewStatus, sortKey]);

  const visible =
    selectedTicker === "all"
      ? models
      : models.filter((m) => m.ticker === selectedTicker);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xs font-medium uppercase tracking-wider text-terminal-muted">
            Trading Analysis Cards
          </h2>
          <p className="mt-1 text-[11px] text-terminal-muted">
            Excel-style workflow · Green bullish/pass · Red bearish/fail · Yellow
            neutral/watch · S/R manual only
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <select
            className="rounded border border-terminal-border bg-terminal-elevated px-2 py-1.5 text-xs"
            value={selectedTicker}
            onChange={(e) => setSelectedTicker(e.target.value)}
          >
            <option value="all">All tickers</option>
            {models.map((m) => (
              <option key={m.watchlistId} value={m.ticker}>
                {m.ticker}
              </option>
            ))}
          </select>
          <Button
            variant={sortKey === "rank" ? "secondary" : "ghost"}
            size="sm"
            onClick={() => setSortKey("rank")}
          >
            By Rank
          </Button>
          <Button
            variant={sortKey === "score" ? "secondary" : "ghost"}
            size="sm"
            onClick={() => setSortKey("score")}
          >
            By Score
          </Button>
          <Button
            variant={sortKey === "ticker" ? "secondary" : "ghost"}
            size="sm"
            onClick={() => setSortKey("ticker")}
          >
            By Ticker
          </Button>
        </div>
      </div>

      <div
        className={
          selectedTicker === "all"
            ? "grid grid-cols-1 gap-4 xl:grid-cols-2"
            : "max-w-3xl"
        }
      >
        {visible.map((model) => (
          <TradingAnalysisCard key={model.watchlistId} model={model} />
        ))}
      </div>
    </div>
  );
}
