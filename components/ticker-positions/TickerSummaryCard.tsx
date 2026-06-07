"use client";

import { Badge } from "@/components/ui/Badge";
import { PageHeader } from "@/components/ui/PageHeader";
import {
  formatRoiPct,
  formatSignedTickerCurrency,
  formatTickerCurrency,
} from "@/lib/ticker-positions/format";
import { formatLeapsLabel } from "@/lib/ticker-positions/leaps";
import type { TickerPositionSummary } from "@/lib/ticker-positions/types";
import { cn } from "@/lib/utils";

interface TickerSummaryCardProps {
  summary: TickerPositionSummary;
  expanded?: boolean;
  onToggle?: () => void;
}

function Metric({
  label,
  value,
  valueClassName,
}: {
  label: string;
  value: string;
  valueClassName?: string;
}) {
  return (
    <div className="space-y-0.5">
      <p className="text-[10px] uppercase tracking-wider text-terminal-muted">
        {label}
      </p>
      <p className={cn("font-mono text-sm font-semibold", valueClassName)}>
        {value}
      </p>
    </div>
  );
}

function StrategyList({
  title,
  strategies,
}: {
  title: string;
  strategies: string[];
}) {
  if (strategies.length === 0) return null;
  return (
    <div>
      <p className="text-[10px] uppercase tracking-wider text-terminal-muted mb-1">
        {title}
      </p>
      <div className="flex flex-wrap gap-1">
        {strategies.map((s) => (
          <Badge key={s} variant="outline" className="text-[10px]">
            {s}
          </Badge>
        ))}
      </div>
    </div>
  );
}

export function TickerSummaryCard({
  summary,
  expanded = false,
  onToggle,
}: TickerSummaryCardProps) {
  const pnlTone =
    summary.totalPnl >= 0 ? "text-profit" : "text-loss";

  return (
    <div className="rounded-lg border border-terminal-border bg-terminal-surface overflow-hidden">
      <button
        type="button"
        onClick={onToggle}
        className="w-full text-left p-4 hover:bg-terminal-elevated/30 transition-colors"
      >
        <div className="flex items-start justify-between gap-3">
          <div>
            <h3 className="font-mono text-lg font-semibold">{summary.ticker}</h3>
            <p className="text-[11px] text-terminal-muted mt-0.5">
              {summary.openTradesCount} open · {summary.closedTradesCount} closed
            </p>
          </div>
          <div className="text-right">
            <p className={cn("font-mono text-lg font-semibold", pnlTone)}>
              {formatSignedTickerCurrency(summary.totalPnl)}
            </p>
            <p className="text-[11px] text-terminal-muted">
              ROI {formatRoiPct(summary.roiPct)}
            </p>
          </div>
        </div>

        <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Metric
            label="Long Position P/L"
            value={formatSignedTickerCurrency(summary.longPositionPnl)}
            valueClassName={
              summary.longPositionPnl >= 0 ? "text-profit" : "text-loss"
            }
          />
          <Metric
            label="Income Collected"
            value={formatSignedTickerCurrency(summary.incomeCollected)}
          />
          <Metric
            label="Adjusted Cost Basis"
            value={
              summary.adjustedCostBasis != null
                ? formatTickerCurrency(summary.adjustedCostBasis)
                : "—"
            }
          />
          <Metric
            label="Capital Deployed"
            value={formatTickerCurrency(summary.totalCapitalDeployed)}
          />
        </div>
      </button>

      {expanded && (
        <div className="border-t border-terminal-border p-4 space-y-4 bg-terminal-elevated/10">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <StrategyList
              title="Long-Term Positions"
              strategies={summary.longTermStrategies}
            />
            <StrategyList
              title="Income Trades"
              strategies={summary.incomeStrategies}
            />
          </div>

          {summary.sharePosition && summary.sharePosition.sharesHeld > 0 && (
            <div className="rounded border border-terminal-border p-3 text-xs">
              <p className="text-[10px] uppercase text-terminal-muted mb-1">
                Shares
              </p>
              <p className="font-mono">
                {summary.sharePosition.sharesHeld} shares · Cost{" "}
                {formatTickerCurrency(summary.sharePosition.costBasis)} · Value{" "}
                {formatTickerCurrency(summary.sharePosition.currentValue)} · P/L{" "}
                {formatSignedTickerCurrency(summary.sharePosition.unrealizedPnl)}
              </p>
            </div>
          )}

          {summary.leapsPositions.map((leaps) => (
            <div
              key={leaps.parentTrade.id}
              className="rounded border border-accent/30 bg-accent/5 p-3 space-y-2 text-xs"
            >
              <p className="font-medium text-terminal-text">
                Parent: {formatLeapsLabel(leaps.parentTrade)}
              </p>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 font-mono">
                <div>
                  <span className="text-terminal-muted">Original Cost </span>
                  {formatTickerCurrency(leaps.originalCost)}
                </div>
                <div>
                  <span className="text-terminal-muted">Premium from CCs </span>
                  {formatTickerCurrency(leaps.premiumFromChildren)}
                </div>
                <div>
                  <span className="text-terminal-muted">Adjusted Basis </span>
                  {formatTickerCurrency(leaps.adjustedCostBasis)}
                </div>
                <div>
                  <span className="text-terminal-muted">Long P/L </span>
                  {formatSignedTickerCurrency(leaps.longPositionPnl)}
                </div>
              </div>
              {leaps.childTrades.length > 0 && (
                <ul className="space-y-1 text-terminal-muted">
                  {leaps.childTrades.map((child, i) => (
                    <li key={child.id}>
                      · Covered Call #{i + 1} — premium{" "}
                      {formatTickerCurrency(
                        child.calculations.totalPremiumReceived
                      )}{" "}
                      · My P/L{" "}
                      {formatSignedTickerCurrency(
                        child.pnlAllocation.myPnl
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          ))}

          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 text-xs">
            <Metric
              label="Realized P/L"
              value={formatSignedTickerCurrency(summary.realizedPnl)}
            />
            <Metric
              label="Unrealized P/L"
              value={formatSignedTickerCurrency(summary.unrealizedPnl)}
            />
            <Metric
              label="Premium Collected"
              value={formatTickerCurrency(summary.totalPremiumCollected)}
            />
            <Metric
              label="Current Value"
              value={formatTickerCurrency(summary.currentPositionValue)}
            />
          </div>
        </div>
      )}
    </div>
  );
}
