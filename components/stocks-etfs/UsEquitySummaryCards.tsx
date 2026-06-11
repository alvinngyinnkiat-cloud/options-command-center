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
  const returnPct = pnlPercentStatProps(summary.totalReturnPct, 1);

  return (
    <section>
      <h2 className="mb-3 text-xs font-medium uppercase tracking-wider text-terminal-muted">
        {title} Summary
      </h2>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-7">
        <Card
          label="Trading Cash"
          value={formatTickerCurrency(summary.cashBalance)}
          sub="Available to deploy"
        />
        <Card
          label="Total Market Value"
          value={formatTickerCurrency(summary.totalMarketValue)}
          sub="USD · open holdings"
        />
        <Card
          label="Total Capital"
          value={formatTickerCurrency(summary.totalCapital)}
        />
        <Card
          label="Total Dividend Income"
          value={formatTickerCurrency(summary.totalDividendIncome)}
        />
        <Card
          label="Total Fees Paid"
          value={formatTickerCurrency(summary.totalFeesPaid)}
          className="hidden sm:block"
        />
        <Card
          label="Performance"
          value={totalPnl.value}
          sub={`ROI ${returnPct.value}`}
          valueClassName={totalPnl.valueClassName}
          className="col-span-2 sm:hidden"
        />
        <Card
          label="Total P/L"
          value={totalPnl.value}
          valueClassName={totalPnl.valueClassName}
          className="hidden sm:block"
        />
        <Card
          label="Total ROI"
          value={returnPct.value}
          valueClassName={returnPct.valueClassName}
          className="hidden sm:block"
        />
      </div>
    </section>
  );
}
