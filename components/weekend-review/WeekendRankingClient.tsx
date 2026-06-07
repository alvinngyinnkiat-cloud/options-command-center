"use client";

import { useMemo, useState } from "react";
import { Badge } from "@/components/ui/Badge";
import { PageHeader } from "@/components/ui/PageHeader";
import { WeekendMarketReviewPanel } from "@/components/weekend-review/WeekendMarketReviewPanel";
import {
  buildRankMap,
  buildWeekendNotesMap,
} from "@/lib/weekend-review/notes-map";
import type {
  WeekendRankingEntry,
  WeekendReviewStatus,
  WeeklyMarketUpdateRecord,
} from "@/lib/weekend-review/types";
import type { EnrichedAlert } from "@/lib/alerts/types";
import type { WatchlistScannerRow } from "@/lib/watchlist/types";
import { TradingAnalysisScannerGrid } from "@/components/watchlist/TradingAnalysisScannerGrid";
import { cn } from "@/lib/utils";
import { Trophy } from "lucide-react";

interface WeekendRankingClientProps {
  initialRows: WatchlistScannerRow[];
  initialRankings: WeekendRankingEntry[];
  initialStatus: WeekendReviewStatus;
  initialHistory: WeeklyMarketUpdateRecord[];
  dataSource: "supabase" | "mock";
  alerts?: EnrichedAlert[];
}

export function WeekendRankingClient({
  initialRows,
  initialRankings,
  initialStatus,
  initialHistory,
  dataSource,
  alerts = [],
}: WeekendRankingClientProps) {
  const [rows, setRows] = useState(initialRows);
  const [rankings, setRankings] = useState(initialRankings);
  const [history, setHistory] = useState(initialHistory);
  const [reviewStatus, setReviewStatus] = useState(initialStatus);

  const rankMap = useMemo(() => buildRankMap(rankings), [rankings]);
  const notesMap = useMemo(() => buildWeekendNotesMap(history), [history]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Weekend Ranking"
        description="Phase 7 ranking dashboard — same analysis scanner sorted by weekend score rank"
        actions={
          <Badge variant={dataSource === "supabase" ? "success" : "outline"}>
            {dataSource === "supabase" ? "Live data" : "Mock data"}
          </Badge>
        }
      />

      <WeekendMarketReviewPanel
        initialStatus={initialStatus}
        onReviewComplete={(result) => {
          setRows(result.rows);
          setRankings(result.rankings);
          setHistory(result.snapshots);
          setReviewStatus(result.status);
        }}
      />

      <div>
        <h2 className="mb-3 flex items-center gap-2 text-xs font-medium uppercase tracking-wider text-terminal-muted">
          <Trophy className="h-3.5 w-3.5" />
          Weekend Rankings — Analysis Scanner
        </h2>
        <TradingAnalysisScannerGrid
          rows={rows}
          reviewStatus={reviewStatus}
          rankByWatchlistId={rankMap}
          weekendNotesByWatchlistId={notesMap}
          alerts={alerts}
          emptyMessage="Run Weekend Market Review to build rankings."
        />
      </div>

      <div>
        <h2 className="mb-3 text-xs font-medium uppercase tracking-wider text-terminal-muted">
          Review History (weekly_market_updates)
        </h2>
        <div className="overflow-x-auto rounded-lg border border-terminal-border">
          <table className="w-full min-w-[900px] text-xs">
            <thead>
              <tr className="border-b border-terminal-border bg-terminal-elevated/60 text-left uppercase tracking-wider text-terminal-muted">
                <th className="px-3 py-2 font-medium">Review Date</th>
                <th className="px-3 py-2 font-medium">Week Ending</th>
                <th className="px-3 py-2 font-medium">Ticker</th>
                <th className="px-3 py-2 font-medium text-right">S1</th>
                <th className="px-3 py-2 font-medium text-right">S2</th>
                <th className="px-3 py-2 font-medium text-right">R1</th>
                <th className="px-3 py-2 font-medium text-right">R2</th>
                <th className="px-3 py-2 font-medium">Analyst Notes</th>
              </tr>
            </thead>
            <tbody>
              {history.map((row) => (
                <tr
                  key={row.id}
                  className="border-b border-terminal-border/40 hover:bg-terminal-elevated/30"
                >
                  <td className="px-3 py-2 text-terminal-muted">
                    {row.reviewDate}
                  </td>
                  <td className="px-3 py-2 text-terminal-muted">
                    {row.weekEnding}
                  </td>
                  <td className="px-3 py-2 font-mono font-semibold text-terminal-text">
                    {row.ticker}
                  </td>
                  <td className="px-3 py-2 font-mono text-right">
                    {row.support1 ?? "—"}
                  </td>
                  <td className="px-3 py-2 font-mono text-right">
                    {row.support2 ?? "—"}
                  </td>
                  <td className="px-3 py-2 font-mono text-right">
                    {row.resistance1 ?? "—"}
                  </td>
                  <td className="px-3 py-2 font-mono text-right">
                    {row.resistance2 ?? "—"}
                  </td>
                  <td
                    className={cn(
                      "px-3 py-2 max-w-xs truncate",
                      row.analystNotes ? "text-terminal-text" : "text-terminal-muted"
                    )}
                  >
                    {row.analystNotes ?? "—"}
                  </td>
                </tr>
              ))}
              {history.length === 0 && (
                <tr>
                  <td
                    colSpan={8}
                    className="px-3 py-8 text-center text-terminal-muted"
                  >
                    No review history yet. S/R snapshots are saved when you run
                    Weekend Market Review.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
