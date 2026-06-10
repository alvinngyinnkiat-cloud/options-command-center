"use client";

import { useEffect, useState } from "react";
import { getStochasticDebugAction } from "@/app/actions/watchlist";
import { formatReviewDateLabel } from "@/lib/weekend-review/dates";
import type { StochasticDebugInfo } from "@/lib/watchlist/compute-indicators";
import type { WeekendReviewStatus } from "@/lib/weekend-review/types";
import {
  formatIndicator,
  formatStochastic,
} from "@/lib/watchlist/format";
import type { TradingAnalysisViewModel } from "@/lib/watchlist/analysis-card";
import type { WatchlistScannerRow } from "@/lib/watchlist/types";
import { cn } from "@/lib/utils";

interface TradingAnalysisExpandedRowProps {
  row: WatchlistScannerRow;
  model: TradingAnalysisViewModel;
  reviewStatus: WeekendReviewStatus;
  weekendAnalystNote?: string | null;
  colSpan: number;
}

function DetailBlock({
  title,
  children,
  className,
}: {
  title: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("space-y-2", className)}>
      <p className="text-[10px] font-medium uppercase tracking-wider text-terminal-muted">
        {title}
      </p>
      {children}
    </div>
  );
}

export function TradingAnalysisExpandedRow({
  row,
  model,
  reviewStatus,
  weekendAnalystNote,
  colSpan,
}: TradingAnalysisExpandedRowProps) {
  const score = row.score;
  const srNotes = row.supportResistance.notes;
  const [soDebug, setSoDebug] = useState<StochasticDebugInfo | null>(null);

  useEffect(() => {
    let cancelled = false;
    void getStochasticDebugAction(row.watchlistId, row.ticker).then((debug) => {
      if (!cancelled) setSoDebug(debug);
    });
    return () => {
      cancelled = true;
    };
  }, [row.watchlistId, row.ticker]);

  return (
    <tr className="border-b border-terminal-border/50 bg-terminal-elevated/20">
      <td colSpan={colSpan} className="px-4 py-4">
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2 xl:grid-cols-3">
          <DetailBlock title="Market & Technicals">
            <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-xs">
              {[
                ["Average Price", formatIndicator(model.currentAveragePrice)],
                ["ATR", formatIndicator(model.atr14)],
                ["EMA20", formatIndicator(model.ema20)],
                ["SMA50", formatIndicator(model.sma50)],
                ["SMA200", formatIndicator(model.sma200)],
                ["SO", formatStochastic(model.soValue)],
                [
                  "Previous SO",
                  model.previousSo != null
                    ? formatStochastic(model.previousSo)
                    : "—",
                ],
                ["Momentum", model.momentumStatus],
                [
                  "Support",
                  model.support1 != null
                    ? formatIndicator(model.support1)
                    : "—",
                ],
                [
                  "Adjusted Support",
                  model.adjustedSupport1 != null
                    ? formatIndicator(model.adjustedSupport1)
                    : "—",
                ],
                [
                  "Resistance",
                  model.resistance1 != null
                    ? formatIndicator(model.resistance1)
                    : "—",
                ],
                [
                  "Adjusted Resistance",
                  model.adjustedResistance1 != null
                    ? formatIndicator(model.adjustedResistance1)
                    : "—",
                ],
              ].map(([label, value]) => (
                <div key={label}>
                  <dt className="text-terminal-muted">{label}</dt>
                  <dd className="font-mono text-terminal-text">{value}</dd>
                </div>
              ))}
            </dl>
          </DetailBlock>

          <DetailBlock title="20 EMA System">
            {score?.tradingSystems ? (
              <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-xs">
                {[
                  [
                    "Average Price",
                    formatIndicator(model.currentAveragePrice),
                  ],
                  [
                    "Support",
                    score.tradingSystems.emaSystem.support != null
                      ? formatIndicator(score.tradingSystems.emaSystem.support)
                      : "—",
                  ],
                  [
                    "Adjusted Support",
                    score.tradingSystems.emaSystem.adjustedSupport != null
                      ? formatIndicator(
                          score.tradingSystems.emaSystem.adjustedSupport
                        )
                      : "—",
                  ],
                  [
                    "Resistance",
                    score.tradingSystems.emaSystem.resistance != null
                      ? formatIndicator(score.tradingSystems.emaSystem.resistance)
                      : "—",
                  ],
                  [
                    "Adjusted Resistance",
                    score.tradingSystems.emaSystem.adjustedResistance != null
                      ? formatIndicator(
                          score.tradingSystems.emaSystem.adjustedResistance
                        )
                      : "—",
                  ],
                  [
                    "Base S/R Signal",
                    score.tradingSystems.emaSystem.baseSrSignal,
                  ],
                  [
                    "Base S/R Reason",
                    score.tradingSystems.emaSystem.baseSrReason,
                  ],
                  [
                    "EMA Difference",
                    formatIndicator(score.tradingSystems.emaSystem.emaDifference),
                  ],
                  [
                    "EMA Difference %",
                    score.tradingSystems.emaSystem.emaDifferencePct != null
                      ? `${score.tradingSystems.emaSystem.emaDifferencePct.toFixed(2)}%`
                      : "—",
                  ],
                  [
                    "Previous SO",
                    model.previousSo != null
                      ? formatStochastic(model.previousSo)
                      : "—",
                  ],
                  ["Current SO", formatStochastic(model.soValue)],
                  ["SO Direction", score.tradingSystems.emaSystem.soDirection],
                  [
                    "SO Turning Up",
                    score.tradingSystems.emaSystem.soTurningUp,
                  ],
                  [
                    "SO Turning Down",
                    score.tradingSystems.emaSystem.soTurningDown,
                  ],
                  ["EMA Score", String(score.tradingSystems.emaSystem.emaScore)],
                  ["Decision", score.tradingSystems.emaSystem.recommendation],
                  ["Reason", score.tradingSystems.emaSystem.reason],
                ].map(([label, value]) => (
                  <div
                    key={label}
                    className={label === "Reason" ? "col-span-2" : undefined}
                  >
                    <dt className="text-terminal-muted">{label}</dt>
                    <dd className="font-mono text-terminal-text">{value}</dd>
                  </div>
                ))}
              </dl>
            ) : (
              <p className="text-xs text-terminal-muted">No system data</p>
            )}
          </DetailBlock>

          <DetailBlock title="Main System">
            {score?.tradingSystems ? (
              <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-xs">
                {[
                  ["Decision", score.tradingSystems.mainSystem.recommendation],
                  [
                    "Strategy Fit Score",
                    String(score.tradingSystems.mainSystem.strategyFitScore),
                  ],
                  ["Tier", score.tradingSystems.mainSystem.tier],
                  ["Reason", score.tradingSystems.mainSystem.reason],
                ].map(([label, value]) => (
                  <div
                    key={label}
                    className={label === "Reason" ? "col-span-2" : undefined}
                  >
                    <dt className="text-terminal-muted">{label}</dt>
                    <dd className="font-mono text-terminal-text">{value}</dd>
                  </div>
                ))}
              </dl>
            ) : (
              <p className="text-xs text-terminal-muted">No system data</p>
            )}
          </DetailBlock>

          <DetailBlock title="Confluence">
            {score?.tradingSystems ? (
              <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-xs">
                {[
                  ["Status", score.tradingSystems.confluence.status],
                  ["Reason", score.tradingSystems.confluence.reason],
                ].map(([label, value]) => (
                  <div
                    key={label}
                    className={label === "Reason" ? "col-span-2" : undefined}
                  >
                    <dt className="text-terminal-muted">{label}</dt>
                    <dd className="font-mono text-terminal-text">{value}</dd>
                  </div>
                ))}
              </dl>
            ) : (
              <p className="text-xs text-terminal-muted">No confluence data</p>
            )}
          </DetailBlock>

          <DetailBlock title="Stochastic Debug (Daily)">
            {soDebug ? (
              <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-xs">
                {[
                  ["Ticker", soDebug.ticker ?? row.ticker],
                  ["Candle Date", soDebug.candleDate],
                  ["Close", formatIndicator(soDebug.close)],
                  ["Raw High (10-bar)", formatIndicator(soDebug.rawHigh)],
                  ["Raw Low (10-bar)", formatIndicator(soDebug.rawLow)],
                  ["Raw %K", soDebug.rawK.toFixed(2)],
                  ["SO Value (fast %K)", formatStochastic(soDebug.soValue)],
                  [
                    "Smoothed %K (K=3)",
                    soDebug.smoothedK != null
                      ? formatStochastic(soDebug.smoothedK)
                      : "—",
                  ],
                  ["Scanner SO (stored)", formatStochastic(model.soValue)],
                  ["SO Length", String(soDebug.soLength)],
                  ["SO Smoothing", String(soDebug.soSmoothing)],
                  ["Timeframe", soDebug.timeframe],
                ].map(([label, value]) => (
                  <div key={label}>
                    <dt className="text-terminal-muted">{label}</dt>
                    <dd className="font-mono text-terminal-text">{value}</dd>
                  </div>
                ))}
              </dl>
            ) : (
              <p className="text-xs text-terminal-muted">
                Loading daily SO debug… (Length=10, K Smoothing=3)
              </p>
            )}
          </DetailBlock>

          <DetailBlock title="Warning Notes">
            {model.warningNotes.length > 0 ? (
              <ul className="space-y-1 text-xs text-warning">
                {model.warningNotes.map((note) => (
                  <li key={note}>· {note}</li>
                ))}
              </ul>
            ) : (
              <p className="text-xs text-terminal-muted">No warnings</p>
            )}
          </DetailBlock>

          <DetailBlock title="Weekend Review Notes">
            <div className="space-y-2 text-xs leading-relaxed">
              {weekendAnalystNote && (
                <p className="text-terminal-text">
                  <span className="text-terminal-muted">Analyst snapshot: </span>
                  {weekendAnalystNote}
                </p>
              )}
              {srNotes && (
                <p className="text-terminal-text">
                  <span className="text-terminal-muted">Manual S/R notes: </span>
                  {srNotes}
                </p>
              )}
              {!weekendAnalystNote && !srNotes && (
                <p className="text-terminal-muted">No review notes recorded</p>
              )}
              <dl className="grid grid-cols-2 gap-2 pt-1 text-[11px]">
                <div>
                  <dt className="text-terminal-muted">Updated This Weekend</dt>
                  <dd
                    className={cn(
                      "font-medium",
                      model.weekendReview.updatedThisWeekend
                        ? "text-profit"
                        : "text-terminal-muted"
                    )}
                  >
                    {model.weekendReview.updatedThisWeekend ? "Yes" : "No"}
                  </dd>
                </div>
                <div>
                  <dt className="text-terminal-muted">Needs Review</dt>
                  <dd
                    className={cn(
                      "font-medium",
                      model.weekendReview.needsReview
                        ? "text-warning"
                        : "text-profit"
                    )}
                  >
                    {model.weekendReview.needsReview ? "Yes" : "No"}
                  </dd>
                </div>
              </dl>
            </div>
          </DetailBlock>

          <DetailBlock title="Last Review Date">
            <p className="text-xs font-mono text-terminal-text">
              {reviewStatus.lastReviewDate
                ? formatReviewDateLabel(reviewStatus.lastReviewDate)
                : "No review run yet"}
            </p>
            <p className="mt-1 text-[11px] text-terminal-muted">
              S/R last updated: {row.supportResistance.updateDate}
            </p>
            {reviewStatus.weekEnding && (
              <p className="text-[11px] text-terminal-muted">
                Week ending: {reviewStatus.weekEnding}
              </p>
            )}
          </DetailBlock>
        </div>
      </td>
    </tr>
  );
}
