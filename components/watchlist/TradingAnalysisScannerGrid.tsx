"use client";

import { Fragment, useMemo, useState } from "react";
import { buildTradingAnalysisViewModel } from "@/lib/watchlist/analysis-card";
import { decisionClass, strategyClass } from "@/lib/watchlist/scanner-grid-colors";
import { resolveDisplayRank, sortRowsByWatchlistRank } from "@/lib/watchlist/watchlist-rank";
import type { WatchlistScannerRow } from "@/lib/watchlist/types";
import type { WeekendReviewStatus } from "@/lib/weekend-review/types";
import type { TradeReadinessResult } from "@/lib/trading-workflow/types";
import { cn } from "@/lib/utils";
import { filterAlertsByTicker } from "@/lib/alerts/summary";
import type { EnrichedAlert } from "@/lib/alerts/types";
import { ChevronDown, ChevronRight } from "lucide-react";
import { AlertWarningIcon } from "@/components/alerts/AlertWarningIcon";
import { TradingAnalysisExpandedRow } from "./TradingAnalysisExpandedRow";

interface TradingAnalysisScannerGridProps {
  rows: WatchlistScannerRow[];
  reviewStatus: WeekendReviewStatus;
  /** Sort rows by weekend rank (watchlistId → rank) */
  rankByWatchlistId?: Map<string, number>;
  /** Analyst notes from weekly_market_updates keyed by watchlistId */
  weekendNotesByWatchlistId?: Map<string, string | null>;
  alerts?: EnrichedAlert[];
  readinessByTicker?: Record<string, TradeReadinessResult>;
  emptyMessage?: string;
}

/** Expand + Ticker + Rank + Alert + Strategy + Action */
const COLUMN_COUNT = 6;

export function TradingAnalysisScannerGrid({
  rows,
  reviewStatus,
  rankByWatchlistId,
  weekendNotesByWatchlistId,
  alerts = [],
  readinessByTicker = {},
  emptyMessage = "No tickers in scanner universe.",
}: TradingAnalysisScannerGridProps) {
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());

  const sortedRows = useMemo(() => {
    if (rankByWatchlistId?.size) {
      return [...rows].sort((a, b) => {
        const ra = rankByWatchlistId.get(a.watchlistId) ?? 999;
        const rb = rankByWatchlistId.get(b.watchlistId) ?? 999;
        return ra - rb || a.ticker.localeCompare(b.ticker);
      });
    }
    return sortRowsByWatchlistRank(rows);
  }, [rows, rankByWatchlistId]);

  function toggleExpanded(watchlistId: string) {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(watchlistId)) next.delete(watchlistId);
      else next.add(watchlistId);
      return next;
    });
  }

  if (sortedRows.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-terminal-border p-8 text-center text-sm text-terminal-muted">
        {emptyMessage}
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-lg border border-terminal-border">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-terminal-border bg-terminal-elevated/80 text-left uppercase tracking-wider text-terminal-muted">
            <th className="w-10 px-3 py-3" />
            <th className="px-4 py-3 font-medium w-[120px]">Ticker</th>
            <th className="px-4 py-3 font-medium w-16">Rank</th>
            <th className="w-10 px-3 py-3" />
            <th className="px-4 py-3 font-medium">Strategy</th>
            <th className="px-4 py-3 font-medium">Action</th>
          </tr>
        </thead>
        <tbody>
          {sortedRows.map((row) => {
            const model = buildTradingAnalysisViewModel(row, reviewStatus);
            const expanded = expandedIds.has(row.watchlistId);

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
                  <td className="px-4 py-3 font-mono text-terminal-muted">
                    #{resolveDisplayRank(row)}
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
                </tr>
                {expanded && (
                  <TradingAnalysisExpandedRow
                    row={row}
                    model={model}
                    reviewStatus={reviewStatus}
                    weekendAnalystNote={weekendNotesByWatchlistId?.get(
                      row.watchlistId
                    )}
                    readiness={readinessByTicker[row.ticker]}
                    colSpan={COLUMN_COUNT}
                  />
                )}
              </Fragment>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
