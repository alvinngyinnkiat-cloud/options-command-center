"use client";

import {
  formatRoiPct,
  formatSignedTickerCurrency,
  formatTickerCurrency,
} from "@/lib/ticker-positions/format";
import type { UsEquityTabSummary } from "@/lib/stocks-etfs/types";

interface UsEquitySummaryCardsProps {
  title: string;
  summary: UsEquityTabSummary;
}

function Card({
  label,
  value,
  sub,
}: {
  label: string;
  value: string;
  sub?: string;
}) {
  return (
    <div className="rounded-lg border border-terminal-border bg-terminal-surface p-3">
      <p className="text-[10px] uppercase tracking-wider text-terminal-muted">
        {label}
      </p>
      <p className="mt-1 font-mono text-lg font-semibold">{value}</p>
      {sub && <p className="text-[10px] text-terminal-muted mt-0.5">{sub}</p>}
    </div>
  );
}

export function UsEquitySummaryCards({
  title,
  summary,
}: UsEquitySummaryCardsProps) {
  return (
    <section>
      <h2 className="mb-3 text-xs font-medium uppercase tracking-wider text-terminal-muted">
        {title} Summary
      </h2>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        <Card
          label="Total Market Value"
          value={formatTickerCurrency(summary.totalMarketValue)}
          sub="USD · shares + LEAPS"
        />
        <Card
          label="Total P/L"
          value={formatSignedTickerCurrency(summary.totalPnl)}
        />
        <Card
          label="Total Premium Collected"
          value={formatTickerCurrency(summary.totalPremiumCollected)}
        />
        <Card
          label="Adjusted Cost Basis"
          value={formatTickerCurrency(summary.adjustedCostBasis)}
        />
        <Card
          label="Net Position P/L"
          value={formatSignedTickerCurrency(summary.netPositionPnl)}
          sub={`Return ${formatRoiPct(summary.totalReturnPct)}`}
        />
      </div>
    </section>
  );
}
