"use client";

import { pnlPercentStatProps, pnlStatProps } from "@/lib/format/pnl";
import { formatTickerCurrency } from "@/lib/ticker-positions/format";
import type { UsEquityTabSummary } from "@/lib/stocks-etfs/types";

interface UsEquitySummaryCardsProps {
  title: string;
  summary: UsEquityTabSummary;
}

function Card({
  label,
  value,
  sub,
  valueClassName,
}: {
  label: string;
  value: string;
  sub?: string;
  valueClassName?: string;
}) {
  return (
    <div className="rounded-lg border border-terminal-border bg-terminal-surface p-3 min-w-0">
      <p className="text-[10px] uppercase tracking-wider text-terminal-muted">
        {label}
      </p>
      <p
        className={`mt-1 font-mono text-lg font-semibold truncate ${valueClassName ?? "text-terminal-text"}`}
      >
        {value}
      </p>
      {sub && <p className="text-[10px] text-terminal-muted mt-0.5">{sub}</p>}
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
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        <Card
          label="Total Market Value"
          value={formatTickerCurrency(summary.totalMarketValue)}
          sub="USD · holdings only"
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
          label="Total P/L"
          value={totalPnl.value}
          valueClassName={totalPnl.valueClassName}
        />
        <Card
          label="Total ROI"
          value={returnPct.value}
          valueClassName={returnPct.valueClassName}
        />
      </div>
    </section>
  );
}
