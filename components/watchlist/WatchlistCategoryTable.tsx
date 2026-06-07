"use client";

import { Fragment, useMemo, useState } from "react";
import { removeWatchlistTicker } from "@/app/actions/watchlist";
import { AlertWarningIcon } from "@/components/alerts/AlertWarningIcon";
import { Button } from "@/components/ui/Button";
import { filterAlertsByTicker } from "@/lib/alerts/summary";
import type { EnrichedAlert } from "@/lib/alerts/types";
import { buildTradingAnalysisViewModel } from "@/lib/watchlist/analysis-card";
import type { WatchlistCategory } from "@/lib/watchlist/categories";
import { formatScore } from "@/lib/watchlist/format";
import {
  decisionClass,
  strategyClass,
} from "@/lib/watchlist/scanner-grid-colors";
import type { WatchlistScannerRow } from "@/lib/watchlist/types";
import type { WeekendReviewStatus } from "@/lib/weekend-review/types";
import type { TradeReadinessResult } from "@/lib/trading-workflow/types";
import { cn } from "@/lib/utils";
import { ChevronDown, ChevronRight, Trash2 } from "lucide-react";
import { TradingAnalysisExpandedRow } from "./TradingAnalysisExpandedRow";

interface WatchlistCategoryTableProps {
  category: WatchlistCategory;
  rows: WatchlistScannerRow[];
  reviewStatus: WeekendReviewStatus;
  alerts?: EnrichedAlert[];
  readinessByTicker?: Record<string, TradeReadinessResult>;
  allowRemove?: boolean;
  onRowsChange: (rows: WatchlistScannerRow[], dataSource: "supabase" | "mock") => void;
  dataSource: "supabase" | "mock";
}

function ReviewStatusCell({
  needsReview,
  updatedThisWeekend,
}: {
  needsReview: boolean;
  updatedThisWeekend: boolean;
}) {
  if (needsReview) {
    return (
      <span className="text-[11px] font-medium text-warning">Needs Review</span>
    );
  }
  if (updatedThisWeekend) {
    return <span className="text-[11px] font-medium text-profit">Updated</span>;
  }
  return <span className="text-[11px] text-terminal-muted">Current</span>;
}

const COLUMN_COUNT = 7;

export function WatchlistCategoryTable({
  category,
  rows,
  reviewStatus,
  alerts = [],
  readinessByTicker = {},
  allowRemove = false,
  onRowsChange,
  dataSource,
}: WatchlistCategoryTableProps) {
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const [removingId, setRemovingId] = useState<string | null>(null);

  const categoryRows = useMemo(
    () =>
      [...rows]
        .filter((row) => row.category === category)
        .sort(
          (a, b) =>
            a.sortOrder - b.sortOrder || a.ticker.localeCompare(b.ticker)
        ),
    [rows, category]
  );

  function toggleExpanded(watchlistId: string) {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(watchlistId)) next.delete(watchlistId);
      else next.add(watchlistId);
      return next;
    });
  }

  async function handleRemove(watchlistId: string) {
    if (!confirm("Remove this ticker from the watchlist?")) return;
    setRemovingId(watchlistId);
    const result = await removeWatchlistTicker(watchlistId);
    setRemovingId(null);
    if (result.success) {
      onRowsChange(result.rows, result.dataSource);
    }
  }

  if (categoryRows.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-terminal-border p-8 text-center text-sm text-terminal-muted">
        No tickers in {category}.
        {category === "Pullbacks" &&
          " Add tickers from Auto Watchlist or manually below."}
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-lg border border-terminal-border">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-terminal-border bg-terminal-elevated/80 text-left uppercase tracking-wider text-terminal-muted">
            <th className="w-10 px-3 py-3" />
            <th className="px-4 py-3 font-medium">Ticker</th>
            <th className="w-10 px-3 py-3" />
            <th className="px-4 py-3 font-medium">Strategy</th>
            <th className="px-4 py-3 font-medium">Action</th>
            <th className="px-4 py-3 font-medium text-right">Score</th>
            <th className="px-4 py-3 font-medium">Review Status</th>
            {allowRemove && <th className="w-12 px-3 py-3" />}
          </tr>
        </thead>
        <tbody>
          {categoryRows.map((row) => {
            const model = buildTradingAnalysisViewModel(row, reviewStatus);
            const expanded = expandedIds.has(row.watchlistId);
            const combinedScore =
              row.score?.combinedScore ?? row.score?.totalScore ?? null;

            return (
              <Fragment key={row.watchlistId}>
                <tr
                  onClick={() => toggleExpanded(row.watchlistId)}
                  className={cn(
                    "border-b border-terminal-border/50 cursor-pointer transition-colors hover:bg-terminal-elevated/40",
                    expanded && "bg-terminal-elevated/25"
                  )}
                >
                  <td className="px-3 py-3 text-terminal-muted">
                    {expanded ? (
                      <ChevronDown className="h-4 w-4" />
                    ) : (
                      <ChevronRight className="h-4 w-4" />
                    )}
                  </td>
                  <td className="px-4 py-3 font-mono font-semibold text-terminal-text">
                    {model.ticker}
                  </td>
                  <td className="px-3 py-3">
                    <AlertWarningIcon
                      alerts={filterAlertsByTicker(alerts, model.ticker)}
                    />
                  </td>
                  <td
                    className={cn(
                      "px-4 py-3 font-medium",
                      strategyClass(model.strategy)
                    )}
                  >
                    {model.strategy}
                  </td>
                  <td
                    className={cn(
                      "px-4 py-3 font-medium",
                      decisionClass(model.decisionLabel)
                    )}
                  >
                    {model.action}
                  </td>
                  <td className="px-4 py-3 font-mono text-right font-semibold text-accent">
                    {combinedScore != null ? formatScore(combinedScore) : "—"}
                  </td>
                  <td className="px-4 py-3">
                    <ReviewStatusCell
                      needsReview={model.weekendReview.needsReview}
                      updatedThisWeekend={model.weekendReview.updatedThisWeekend}
                    />
                  </td>
                  {allowRemove && (
                    <td className="px-3 py-3">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          void handleRemove(row.watchlistId);
                        }}
                        disabled={removingId === row.watchlistId}
                        aria-label={`Remove ${row.ticker}`}
                        className="text-loss hover:text-loss"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </td>
                  )}
                </tr>
                {expanded && (
                  <TradingAnalysisExpandedRow
                    row={row}
                    model={model}
                    reviewStatus={reviewStatus}
                    readiness={readinessByTicker[row.ticker]}
                    colSpan={allowRemove ? COLUMN_COUNT + 1 : COLUMN_COUNT}
                  />
                )}
              </Fragment>
            );
          })}
        </tbody>
      </table>
      <p className="px-4 py-2 text-[11px] text-terminal-muted border-t border-terminal-border/50">
        {dataSource === "supabase" ? "Live watchlist" : "Mock data"} ·{" "}
        {categoryRows.length} ticker{categoryRows.length !== 1 ? "s" : ""} ·
        Average Price drives scoring · Current Price display-only · S/R manual
        only
      </p>
    </div>
  );
}
