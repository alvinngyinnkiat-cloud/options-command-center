"use client";

import { pnlPercentStatProps, pnlStatProps } from "@/lib/format/pnl";
import { splitSgStockRows } from "@/lib/stocks-etfs/open-closed";
import { mapSgStockRowsToTable } from "@/lib/stocks-etfs/table-rows";
import type { SgStockRow, SgStockTabSummary } from "@/lib/stocks-etfs/types";
import { cn, formatSGD, formatSignedSGD } from "@/lib/utils";
import { StockEtfHoldingsTable } from "./StockEtfHoldingsTable";

interface SgStockTabPanelProps {
  rows: SgStockRow[];
  summary: SgStockTabSummary;
  onRefresh: () => void;
}

function SummaryCard({
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

export function SgStockTabPanel({ rows, summary, onRefresh }: SgStockTabPanelProps) {
  const totalPnl = pnlStatProps(summary.totalPnl);
  const returnPct = pnlPercentStatProps(summary.roiPct, 1);
  const plWithDividend = pnlStatProps(summary.plWithDividend);
  const { open, closed } = splitSgStockRows(rows);

  return (
    <div className="space-y-4">
      <section>
        <h2 className="mb-3 text-xs font-medium uppercase tracking-wider text-terminal-muted">
          SG Stock Summary
        </h2>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
          <SummaryCard
            label="Current Value"
            value={formatSGD(summary.currentValue)}
            sub="Open positions"
          />
          <SummaryCard
            label="Capital Invested"
            value={formatSGD(summary.capitalInvested)}
          />
          <SummaryCard
            label="P&L"
            value={formatSignedSGD(summary.totalPnl)}
            valueClassName={totalPnl.valueClassName}
          />
          <SummaryCard
            label="ROI"
            value={returnPct.value}
            valueClassName={returnPct.valueClassName}
          />
          <SummaryCard
            label="Total Dividend"
            value={formatSGD(summary.totalDividend)}
          />
          <SummaryCard
            label="P&L With Dividend"
            value={formatSignedSGD(summary.plWithDividend)}
            valueClassName={plWithDividend.valueClassName}
          />
        </div>
      </section>

      <section>
        <h2 className="mb-3 text-xs font-medium uppercase tracking-wider text-terminal-muted">
          SG Stock Positions
        </h2>
        <div className="space-y-6">
          <div>
            <h3 className="mb-2 text-[10px] font-medium uppercase tracking-wider text-terminal-muted">
              Open Positions
            </h3>
            <StockEtfHoldingsTable
              rows={mapSgStockRowsToTable(open)}
              emptyLabel="open SG Stock"
              onRefresh={onRefresh}
            />
          </div>
          <div>
            <h3 className="mb-2 text-[10px] font-medium uppercase tracking-wider text-terminal-muted">
              Closed Positions
            </h3>
            <StockEtfHoldingsTable
              rows={mapSgStockRowsToTable(closed)}
              emptyLabel="closed SG Stock"
              onRefresh={onRefresh}
            />
          </div>
        </div>
      </section>
    </div>
  );
}
