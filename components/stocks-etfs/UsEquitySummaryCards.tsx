"use client";

import { pnlPercentStatProps, pnlStatProps } from "@/lib/format/pnl";
import { formatTickerCurrency } from "@/lib/ticker-positions/format";
import type { UsEquityTabSummary } from "@/lib/stocks-etfs/types";
import { cn } from "@/lib/utils";

interface UsEquitySummaryCardsProps {
  title: string;
  summary: UsEquityTabSummary;
}

function Card({
  label,
  value,
  sub,
  valueClassName,
  className,
}: {
  label: string;
  value: string;
  sub?: string;
  valueClassName?: string;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "rounded-lg border border-terminal-border bg-terminal-surface p-3 min-w-0",
        className
      )}
    >
      <p className="text-[10px] uppercase tracking-wider text-terminal-muted">
        {label}
      </p>
      <p
        className={cn(
          "mt-1 font-mono text-lg font-semibold tabular-nums break-words",
          valueClassName ?? "text-terminal-text"
        )}
      >
        {value}
      </p>
      {sub && (
        <p className="text-[10px] text-terminal-muted mt-0.5 tabular-nums break-words">
          {sub}
        </p>
      )}
    </div>
  );
}

export function UsEquitySummaryCards({
  title,
  summary,
}: UsEquitySummaryCardsProps) {
  const totalPnl = pnlStatProps(summary.totalPnl);
  const returnPct = pnlPercentStatProps(summary.roiPct, 1);
  const plWithDividend = pnlStatProps(summary.plWithDividend);

  return (
    <section>
      <h2 className="mb-3 text-xs font-medium uppercase tracking-wider text-terminal-muted">
        {title} Summary
      </h2>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        <Card
          label="Current Value"
          value={formatTickerCurrency(summary.currentValue)}
          sub="USD · open positions"
        />
        <Card
          label="Capital Invested"
          value={formatTickerCurrency(summary.capitalInvested)}
        />
        <Card
          label="P&L"
          value={totalPnl.value}
          valueClassName={totalPnl.valueClassName}
        />
        <Card
          label="ROI"
          value={returnPct.value}
          valueClassName={returnPct.valueClassName}
        />
        <Card
          label="Total Dividend"
          value={formatTickerCurrency(summary.totalDividend)}
        />
        <Card
          label="P&L With Dividend"
          value={plWithDividend.value}
          valueClassName={plWithDividend.valueClassName}
        />
      </div>
    </section>
  );
}
