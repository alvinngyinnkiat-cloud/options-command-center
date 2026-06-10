"use client";

import { formatReviewDateLabel } from "@/lib/weekend-review/dates";
import type { WeekendReviewStatus } from "@/lib/weekend-review/types";
import {
  formatIndicator,
  formatScoreFraction,
  formatStochastic,
} from "@/lib/watchlist/format";
import type { TradingAnalysisViewModel } from "@/lib/watchlist/analysis-card";
import { passFailClass } from "@/lib/watchlist/scanner-grid-colors";
import { SCORE_WEIGHTS } from "@/lib/watchlist/scoring/types";
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
  const rec = score?.recommendation;
  const srNotes = row.supportResistance.notes;

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

          <DetailBlock title="20 EMA System (Shorter-DTE)">
            {score?.tradingSystems ? (
              <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-xs">
                {[
                  ["Decision", score.tradingSystems.emaSystem.recommendation],
                  ["EMA Score", String(score.tradingSystems.emaSystem.emaScore)],
                  ["Tier", score.tradingSystems.emaSystem.tier],
                  ["Reason", score.tradingSystems.emaSystem.reason],
                ].map(([label, value]) => (
                  <div key={label} className={label === "Reason" ? "col-span-2" : undefined}>
                    <dt className="text-terminal-muted">{label}</dt>
                    <dd className="font-mono text-terminal-text">{value}</dd>
                  </div>
                ))}
              </dl>
            ) : (
              <p className="text-xs text-terminal-muted">No system data</p>
            )}
          </DetailBlock>

          <DetailBlock title="Main System (Main Workflow)">
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
                  <div key={label} className={label === "Reason" ? "col-span-2" : undefined}>
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
                  [
                    "Confluence Score",
                    `${score.tradingSystems.confluence.score}/10`,
                  ],
                  ["Status", score.tradingSystems.confluence.status],
                  ["Reason", score.tradingSystems.confluence.reason],
                ].map(([label, value]) => (
                  <div key={label} className={label === "Reason" ? "col-span-2" : undefined}>
                    <dt className="text-terminal-muted">{label}</dt>
                    <dd className="font-mono text-terminal-text">{value}</dd>
                  </div>
                ))}
              </dl>
            ) : (
              <p className="text-xs text-terminal-muted">No confluence data</p>
            )}
          </DetailBlock>

          <DetailBlock title="Score Breakdown">
            {score ? (
              <ul className="space-y-1.5 text-xs">
                {[
                  { label: "Trend", result: score.trend },
                  { label: "Stochastic", result: score.stochastic },
                  { label: "EMA20", result: score.ema20 },
                  { label: "Support / Resistance", result: score.supportResistance },
                ].map(({ label, result }) => (
                  <li
                    key={label}
                    className="flex items-start justify-between gap-3"
                  >
                    <span className="text-terminal-muted">{label}</span>
                    <span
                      className={cn(
                        "font-mono text-right",
                        passFailClass(result.passed)
                      )}
                      title={result.reason}
                    >
                      {formatScoreFraction(result.score, result.maxScore)}
                    </span>
                  </li>
                ))}
                <li className="flex items-center justify-between gap-3 border-t border-terminal-border/50 pt-1.5 font-medium">
                  <span className="text-terminal-text">Total</span>
                  <span className="font-mono text-terminal-text">
                    {score.totalScore}/{SCORE_WEIGHTS.total}
                  </span>
                </li>
              </ul>
            ) : (
              <p className="text-xs text-terminal-muted">No score data</p>
            )}
            {rec?.scoreBreakdown && (
              <ul className="mt-2 space-y-1 border-t border-terminal-border/40 pt-2 text-[11px] text-terminal-muted">
                {rec.scoreBreakdown.map((item) => (
                  <li key={item.category} title={item.reason}>
                    · {item.category}: {item.reason}
                  </li>
                ))}
              </ul>
            )}
          </DetailBlock>

          <DetailBlock title="Reason">
            {rec ? (
              <div className="space-y-2 text-xs leading-relaxed">
                <p className="text-terminal-text">{rec.primaryReason}</p>
                <p className="text-terminal-muted">{rec.passFailExplanation}</p>
              </div>
            ) : (
              <p className="text-xs text-terminal-muted">—</p>
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
