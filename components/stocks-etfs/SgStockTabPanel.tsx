"use client";

import { pnlPercentStatProps, pnlStatProps } from "@/lib/format/pnl";
import { mapSgStockRowsToTable } from "@/lib/stocks-etfs/table-rows";
import type { SgStockRow, SgStockTabSummary } from "@/lib/stocks-etfs/types";
import { formatSGD, formatSignedSGD } from "@/lib/utils";
import { StockEtfHoldingsTable } from "./StockEtfHoldingsTable";

interface SgStockTabPanelProps {
  rows: SgStockRow[];
  summary: SgStockTabSummary;
  onRefresh: () => void;
}

function SummaryCard({
  label,
  value,
  valueClassName,
}: {
  label: string;
  value: string;
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
    </div>
  );
}

export function SgStockTabPanel({ rows, summary, onRefresh }: SgStockTabPanelProps) {
  const totalPnl = pnlStatProps(summary.totalPnl);
  const returnPct = pnlPercentStatProps(summary.totalReturnPct, 1);

  return (
    <div className="space-y-4">
      <section>
        <h2 className="mb-3 text-xs font-medium uppercase tracking-wider text-terminal-muted">
          SG Stock Summary
        </h2>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
          <SummaryCard
            label="Total Market Value"
            value={formatSGD(summary.totalMarketValue)}
          />
          <SummaryCard
            label="Total Capital"
            value={formatSGD(summary.totalCapital)}
          />
          <SummaryCard
            label="Total Dividend Income"
            value={formatSGD(summary.totalDividendIncome)}
          />
          <SummaryCard
            label="Total P/L"
            value={formatSignedSGD(summary.totalPnl)}
            valueClassName={totalPnl.valueClassName}
          />
          <SummaryCard
            label="Total ROI"
            value={returnPct.value}
            valueClassName={returnPct.valueClassName}
          />
        </div>
      </section>

      <section>
        <h2 className="mb-3 text-xs font-medium uppercase tracking-wider text-terminal-muted">
          SG Stock Positions
        </h2>
        <StockEtfHoldingsTable
          rows={mapSgStockRowsToTable(rows)}
          emptyLabel="SG Stock"
          onRefresh={onRefresh}
        />
      </section>
    </div>
  );
}
