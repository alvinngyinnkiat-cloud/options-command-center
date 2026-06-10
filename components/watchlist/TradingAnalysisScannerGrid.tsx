"use client";

import { Fragment, useMemo, useState } from "react";
import { buildTradingAnalysisViewModel } from "@/lib/watchlist/analysis-card";
import { sortRowsByTradingSystems } from "@/lib/watchlist/scoring/map-row";
import { resolveDisplayRank } from "@/lib/watchlist/watchlist-rank";
import type { WatchlistScannerRow } from "@/lib/watchlist/types";
import type { WeekendReviewStatus } from "@/lib/weekend-review/types";
import type { TradeReadinessResult } from "@/lib/trading-workflow/types";
import { cn } from "@/lib/utils";
import { formatScore } from "@/lib/watchlist/format";
import { filterAlertsByTicker } from "@/lib/alerts/summary";
import type { EnrichedAlert } from "@/lib/alerts/types";
import { ChevronDown, ChevronRight } from "lucide-react";
import { AlertWarningIcon } from "@/components/alerts/AlertWarningIcon";
import { TradingAnalysisExpandedRow } from "./TradingAnalysisExpandedRow";

interface TradingAnalysisScannerGridProps {
  rows: WatchlistScannerRow[];
  reviewStatus: WeekendReviewStatus;
  rankByWatchlistId?: Map<string, number>;
  weekendNotesByWatchlistId?: Map<string, string | null>;
  alerts?: EnrichedAlert[];
  readinessByTicker?: Record<string, TradeReadinessResult>;
  emptyMessage?: string;
}

const COLUMN_COUNT = 9;

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
    return sortRowsByTradingSystems(rows);
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
      <table className="w-full text-sm min-w-[960px]">
        <thead>
          <tr className="border-b border-terminal-border bg-terminal-elevated/80 text-left uppercase tracking-wider text-terminal-muted">
            <th className="w-10 px-3 py-3" />
            <th className="px-3 py-3 font-medium">Ticker</th>
            <th className="px-3 py-3 font-medium w-14">Rank</th>
            <th className="w-10 px-3 py-3" />
            <th className="px-3 py-3 font-medium">EMA System</th>
            <th className="px-3 py-3 font-medium text-right">EMA Score</th>
            <th className="px-3 py-3 font-medium">Main System</th>
            <th className="px-3 py-3 font-medium text-right">Main Score</th>
            <th className="px-3 py-3 font-medium text-right">Confluence</th>
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
                  <td className="px-3 py-3 font-mono font-semibold text-terminal-text">
                    {model.ticker}
                  </td>
                  <td className="px-3 py-3 font-mono text-terminal-muted">
                    #{resolveDisplayRank(row)}
                  </td>
                  <td className="px-3 py-3">
                    <AlertWarningIcon
                      alerts={filterAlertsByTicker(alerts, model.ticker)}
                    />
                  </td>
                  <td className="px-3 py-3 font-medium text-terminal-text">
                    {model.emaRecommendation}
                  </td>
                  <td className="px-3 py-3 font-mono text-right text-terminal-text">
                    {model.emaSystemScore != null
                      ? formatScore(model.emaSystemScore)
                      : "—"}
                  </td>
                  <td className="px-3 py-3 font-medium text-terminal-text">
                    {model.mainRecommendation}
                  </td>
                  <td className="px-3 py-3 font-mono text-right text-terminal-text">
                    {model.mainSystemScore != null
                      ? formatScore(model.mainSystemScore)
                      : "—"}
                  </td>
                  <td
                    className="px-3 py-3 font-mono text-right font-semibold text-accent"
                    title={model.confluenceStatus}
                  >
                    {model.confluenceScore != null
                      ? `${model.confluenceScore}/10`
                      : "—"}
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
