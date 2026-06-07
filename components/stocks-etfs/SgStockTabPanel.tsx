"use client";

import { formatSGD, formatSignedSGD } from "@/lib/utils";
import type { SgStockRow, SgStockTabSummary } from "@/lib/stocks-etfs/types";
import type { HoldingsDisplayMode } from "./HoldingsDisplayToggle";
import { SgStockHoldingsViews } from "./SgStockHoldingsViews";

interface SgStockTabPanelProps {
  rows: SgStockRow[];
  summary: SgStockTabSummary;
  displayMode: HoldingsDisplayMode;
}

function SummaryCard({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-lg border border-terminal-border bg-terminal-surface p-3">
      <p className="text-[10px] uppercase tracking-wider text-terminal-muted">
        {label}
      </p>
      <p className="mt-1 font-mono text-lg font-semibold">{value}</p>
    </div>
  );
}

export function SgStockTabPanel({
  rows,
  summary,
  displayMode,
}: SgStockTabPanelProps) {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <SummaryCard
          label="Total Market Value"
          value={formatSGD(summary.totalMarketValue)}
        />
        <SummaryCard
          label="Total P/L"
          value={formatSignedSGD(summary.totalPnl)}
        />
        <SummaryCard
          label="Total Dividend Income"
          value={formatSGD(summary.totalDividendIncome)}
        />
      </div>

      <section>
        <h2 className="mb-3 text-xs font-medium uppercase tracking-wider text-terminal-muted">
          SG Stock Positions
        </h2>
        <SgStockHoldingsViews rows={rows} mode={displayMode} />
      </section>
    </div>
  );
}
