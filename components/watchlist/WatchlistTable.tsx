"use client";

import { useState } from "react";
import { removeWatchlistTicker } from "@/app/actions/watchlist";
import { Button } from "@/components/ui/Button";
import {
  formatDistancePct,
  formatIndicator,
  formatPrice,
  formatScore,
  formatSignedPrice,
  formatStochastic,
} from "@/lib/watchlist/format";
import { resolveDisplayRank } from "@/lib/watchlist/watchlist-rank";
import type { WatchlistScannerRow } from "@/lib/watchlist/types";
import { cn, formatPercent } from "@/lib/utils";
import { Pencil, Trash2 } from "lucide-react";
import { AveragePricePositionCell } from "./AveragePricePositionCell";
import { DecisionBadge } from "./DecisionBadge";
import { DirectionIndicator } from "./DirectionIndicator";
import { IndicatorComparisonCell } from "./IndicatorComparisonCell";
import { ScoreCell } from "./ScoreCell";
import { SupportResistanceEditor } from "./SupportResistanceEditor";

interface WatchlistTableProps {
  rows: WatchlistScannerRow[];
  dataSource: "supabase" | "mock";
  onRowsChange: (rows: WatchlistScannerRow[], dataSource: "supabase" | "mock") => void;
}

export function WatchlistTable({
  rows,
  dataSource,
  onRowsChange,
}: WatchlistTableProps) {
  const [editingRow, setEditingRow] = useState<WatchlistScannerRow | null>(null);
  const [removingId, setRemovingId] = useState<string | null>(null);

  async function handleRemove(watchlistId: string) {
    if (!confirm("Remove this ticker from the watchlist?")) return;

    setRemovingId(watchlistId);
    const result = await removeWatchlistTicker(watchlistId);
    setRemovingId(null);

    if (result.success) {
      onRowsChange(result.rows, result.dataSource);
    }
  }

  return (
    <>
      <div className="overflow-x-auto rounded-lg border border-terminal-border">
        <table className="w-full min-w-[2200px] text-xs">
          <thead>
            <tr className="border-b border-terminal-border bg-terminal-elevated/80 text-left uppercase tracking-wider text-terminal-muted">
              <th className="sticky left-0 z-10 bg-terminal-elevated px-3 py-2.5 font-medium min-w-[72px]">
                Ticker
              </th>
              <th className="sticky left-[72px] z-10 bg-terminal-elevated px-2 py-2.5 font-medium min-w-[48px]">
                Rank
              </th>
              <th
                colSpan={8}
                className="px-3 py-2 font-medium text-center border-l border-terminal-border text-accent/80"
              >
                Market Data
              </th>
              <th
                colSpan={5}
                className="px-3 py-2 font-medium text-center border-l border-terminal-border text-warning/90"
              >
                Actual Day vs Previous Day (Average Price)
              </th>
              <th
                colSpan={5}
                className="px-3 py-2 font-medium text-center border-l border-terminal-border text-profit/80"
              >
                Technicals (Today)
              </th>
              <th
                colSpan={5}
                className="px-3 py-2 font-medium text-center border-l border-terminal-border text-accent/70"
              >
                Technicals vs Previous Day
              </th>
              <th colSpan={3} className="px-3 py-2 font-medium text-center border-l border-terminal-border text-warning/80">
                Distance % (Avg Price)
              </th>
              <th colSpan={5} className="px-3 py-2 font-medium text-center border-l border-terminal-border">
                Manual S/R
              </th>
              <th
                colSpan={7}
                className="px-3 py-2 font-medium text-center border-l border-terminal-border text-accent"
              >
                Scanner Scores
              </th>
              <th className="px-3 py-2.5 font-medium border-l border-terminal-border">
                Actions
              </th>
            </tr>
            <tr className="border-b border-terminal-border bg-terminal-surface text-left uppercase tracking-wider text-terminal-muted">
              <th className="sticky left-0 z-10 bg-terminal-surface px-3 py-2 font-medium" />
              <th className="sticky left-[72px] z-10 bg-terminal-surface px-2 py-2 font-medium" />
              <th className="px-2 py-2 font-medium border-l border-terminal-border">Current</th>
              <th className="px-2 py-2 font-medium">Open</th>
              <th className="px-2 py-2 font-medium">High</th>
              <th className="px-2 py-2 font-medium">Low</th>
              <th className="px-2 py-2 font-medium">Avg</th>
              <th className="px-2 py-2 font-medium">Close</th>
              <th className="px-2 py-2 font-medium">Prev Close</th>
              <th className="px-2 py-2 font-medium text-right">Chg%</th>
              <th className="px-2 py-2 font-medium border-l border-terminal-border">Today Avg</th>
              <th className="px-2 py-2 font-medium">Prev Avg</th>
              <th className="px-2 py-2 font-medium text-right">Diff</th>
              <th className="px-2 py-2 font-medium text-right">Diff%</th>
              <th className="px-2 py-2 font-medium">Dir</th>
              <th className="px-2 py-2 font-medium border-l border-terminal-border">ATR14</th>
              <th className="px-2 py-2 font-medium">EMA20</th>
              <th className="px-2 py-2 font-medium">SMA50</th>
              <th className="px-2 py-2 font-medium">SMA200</th>
              <th className="px-2 py-2 font-medium text-right">Stoch</th>
              <th className="px-2 py-2 font-medium border-l border-terminal-border text-right">ATR14</th>
              <th className="px-2 py-2 font-medium text-right">EMA20</th>
              <th className="px-2 py-2 font-medium text-right">SMA50</th>
              <th className="px-2 py-2 font-medium text-right">SMA200</th>
              <th className="px-2 py-2 font-medium text-right">Stoch</th>
              <th className="px-2 py-2 font-medium border-l border-terminal-border text-right">EMA20</th>
              <th className="px-2 py-2 font-medium text-right">SMA50</th>
              <th className="px-2 py-2 font-medium text-right">SMA200</th>
              <th className="px-2 py-2 font-medium border-l border-terminal-border">S1</th>
              <th className="px-2 py-2 font-medium">S2</th>
              <th className="px-2 py-2 font-medium">R1</th>
              <th className="px-2 py-2 font-medium">R2</th>
              <th className="px-2 py-2 font-medium">Avg Position</th>
              <th className="px-2 py-2 font-medium border-l border-terminal-border">Recommend</th>
              <th className="px-2 py-2 font-medium text-right">Trend</th>
              <th className="px-2 py-2 font-medium text-right">Stoch</th>
              <th className="px-2 py-2 font-medium text-right">EMA</th>
              <th className="px-2 py-2 font-medium text-right">S/R</th>
              <th className="px-2 py-2 font-medium text-right">Tech</th>
              <th className="px-2 py-2 font-medium text-right">Intel</th>
              <th className="px-2 py-2 font-medium text-right">Combined</th>
              <th className="px-2 py-2 font-medium">Decision</th>
              <th className="px-2 py-2 font-medium border-l border-terminal-border" />
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => {
              const avg = row.averagePriceComparison;
              const avgDiffClass =
                avg.difference > 0
                  ? "text-profit"
                  : avg.difference < 0
                    ? "text-loss"
                    : "text-terminal-muted";

              return (
                <tr
                  key={row.watchlistId}
                  className="border-b border-terminal-border/50 hover:bg-terminal-elevated/40 transition-colors"
                >
                  <td className="sticky left-0 z-10 bg-terminal-bg px-3 py-2.5 font-mono font-semibold text-terminal-text">
                    {row.ticker}
                  </td>
                  <td className="sticky left-[72px] z-10 bg-terminal-bg px-2 py-2.5 font-mono text-terminal-muted">
                    #{resolveDisplayRank(row)}
                  </td>

                  <td className="px-2 py-2.5 font-mono border-l border-terminal-border/50 text-terminal-text">
                    {formatPrice(row.market.currentPrice)}
                  </td>
                  <td className="px-2 py-2.5 font-mono text-terminal-muted">
                    {formatPrice(row.market.open)}
                  </td>
                  <td className="px-2 py-2.5 font-mono text-profit">
                    {formatPrice(row.market.high)}
                  </td>
                  <td className="px-2 py-2.5 font-mono text-loss">
                    {formatPrice(row.market.low)}
                  </td>
                  <td className="px-2 py-2.5 font-mono text-accent">
                    {formatPrice(row.market.averagePrice)}
                  </td>
                  <td className="px-2 py-2.5 font-mono text-terminal-text">
                    {formatPrice(row.market.close)}
                  </td>
                  <td className="px-2 py-2.5 font-mono text-terminal-muted">
                    {formatPrice(row.market.previousClose)}
                  </td>
                  <td
                    className={cn(
                      "px-2 py-2.5 font-mono text-right",
                      row.market.dailyChangePct >= 0 ? "text-profit" : "text-loss"
                    )}
                  >
                    {formatPercent(row.market.dailyChangePct)}
                  </td>

                  <td className="px-2 py-2.5 font-mono border-l border-terminal-border/50 text-accent">
                    {formatPrice(avg.todayAverage)}
                  </td>
                  <td className="px-2 py-2.5 font-mono text-terminal-muted">
                    {formatPrice(avg.previousAverage)}
                  </td>
                  <td className={cn("px-2 py-2.5 font-mono text-right", avgDiffClass)}>
                    {formatSignedPrice(avg.difference)}
                  </td>
                  <td className={cn("px-2 py-2.5 font-mono text-right", avgDiffClass)}>
                    {formatPercent(avg.differencePct)}
                  </td>
                  <td className="px-2 py-2.5">
                    <DirectionIndicator direction={avg.direction} />
                  </td>

                  <td className="px-2 py-2.5 font-mono border-l border-terminal-border/50 text-terminal-muted">
                    {formatIndicator(row.technicals.atr14)}
                  </td>
                  <td className="px-2 py-2.5 font-mono text-terminal-text">
                    {formatIndicator(row.technicals.ema20)}
                  </td>
                  <td className="px-2 py-2.5 font-mono text-terminal-text">
                    {formatIndicator(row.technicals.sma50)}
                  </td>
                  <td className="px-2 py-2.5 font-mono text-terminal-text">
                    {formatIndicator(row.technicals.sma200)}
                  </td>
                  <td className="px-2 py-2.5 font-mono text-right text-terminal-muted">
                    {formatStochastic(row.technicals.stochastic)}
                  </td>

                  <IndicatorComparisonCell
                    comparison={row.technicalComparisons.atr14}
                    kind="price"
                  />
                  <IndicatorComparisonCell
                    comparison={row.technicalComparisons.ema20}
                    kind="price"
                  />
                  <IndicatorComparisonCell
                    comparison={row.technicalComparisons.sma50}
                    kind="price"
                  />
                  <IndicatorComparisonCell
                    comparison={row.technicalComparisons.sma200}
                    kind="price"
                  />
                  <IndicatorComparisonCell
                    comparison={row.technicalComparisons.stochastic}
                    kind="stochastic"
                  />

                  <td
                    className={cn(
                      "px-2 py-2.5 font-mono text-right border-l border-terminal-border/50",
                      row.distances.distanceEma20Pct >= 0 ? "text-profit" : "text-loss"
                    )}
                  >
                    {formatDistancePct(row.distances.distanceEma20Pct)}
                  </td>
                  <td
                    className={cn(
                      "px-2 py-2.5 font-mono text-right",
                      row.distances.distanceSma50Pct >= 0 ? "text-profit" : "text-loss"
                    )}
                  >
                    {formatDistancePct(row.distances.distanceSma50Pct)}
                  </td>
                  <td
                    className={cn(
                      "px-2 py-2.5 font-mono text-right",
                      row.distances.distanceSma200Pct >= 0 ? "text-profit" : "text-loss"
                    )}
                  >
                    {formatDistancePct(row.distances.distanceSma200Pct)}
                  </td>

                  <td className="px-2 py-2.5 font-mono border-l border-terminal-border/50 text-terminal-text">
                    {row.supportResistance.support1 != null
                      ? formatPrice(row.supportResistance.support1)
                      : "—"}
                  </td>
                  <td className="px-2 py-2.5 font-mono text-terminal-text">
                    {row.supportResistance.support2 != null
                      ? formatPrice(row.supportResistance.support2)
                      : "—"}
                  </td>
                  <td className="px-2 py-2.5 font-mono text-terminal-text">
                    {row.supportResistance.resistance1 != null
                      ? formatPrice(row.supportResistance.resistance1)
                      : "—"}
                  </td>
                  <td className="px-2 py-2.5 font-mono text-terminal-text">
                    {row.supportResistance.resistance2 != null
                      ? formatPrice(row.supportResistance.resistance2)
                      : "—"}
                  </td>
                  <td className="px-2 py-2.5">
                    <AveragePricePositionCell position={row.averagePricePosition} />
                  </td>

                  {row.score ? (
                    <>
                      <td
                        className="px-2 py-2.5 border-l border-terminal-border/50 font-medium whitespace-nowrap text-terminal-text"
                        title={row.score.recommendation.primaryReason}
                      >
                        {row.score.recommendation.recommendedStrategy}
                      </td>
                      <ScoreCell result={row.score.trend} />
                      <ScoreCell result={row.score.stochastic} />
                      <ScoreCell result={row.score.ema20} />
                      <ScoreCell result={row.score.supportResistance} />
                      <td className="px-2 py-2.5 font-mono text-right text-terminal-text">
                        {formatScore(row.score.totalScore)}
                      </td>
                      <td className="px-2 py-2.5 font-mono text-right text-terminal-muted">
                        {formatScore(row.score.intelligence.score)}
                      </td>
                      <td className="px-2 py-2.5 font-mono text-right font-semibold text-accent">
                        {formatScore(row.score.combinedScore)}
                      </td>
                      <td className="px-2 py-2.5">
                        <DecisionBadge label={row.score.combinedDecisionLabel} />
                      </td>
                    </>
                  ) : (
                    <td
                      colSpan={9}
                      className="px-2 py-2.5 border-l border-terminal-border/50 text-terminal-muted"
                    >
                      —
                    </td>
                  )}

                  <td className="px-2 py-2.5 border-l border-terminal-border/50">
                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setEditingRow(row)}
                        aria-label={`Edit S/R for ${row.ticker}`}
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleRemove(row.watchlistId)}
                        disabled={removingId === row.watchlistId}
                        aria-label={`Remove ${row.ticker}`}
                        className="text-loss hover:text-loss"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {rows.length === 0 && (
        <p className="py-12 text-center text-sm text-terminal-muted">
          Watchlist is empty. Add a ticker to get started.
        </p>
      )}

      {editingRow && (
        <SupportResistanceEditor
          row={editingRow}
          onClose={() => setEditingRow(null)}
          onSaved={(updatedRows, source) => {
            onRowsChange(updatedRows, source);
            setEditingRow(null);
          }}
        />
      )}

      <p className="mt-2 text-[11px] text-terminal-muted">
        {dataSource === "supabase" ? "Live watchlist" : "Mock market data"} ·{" "}
        {rows.length} ticker{rows.length !== 1 ? "s" : ""} · Average Price = (High +
        Low) / 2 · Scores and recommendations use Average Price · Current Price display-only · S/R manual only
      </p>
    </>
  );
}
