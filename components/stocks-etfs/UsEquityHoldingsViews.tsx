"use client";

import {
  formatIncomeYieldPct,
  formatRoiPct,
  formatSignedTickerCurrency,
  formatTickerCurrency,
} from "@/lib/ticker-positions/format";
import { categoryLabel } from "@/lib/stocks-etfs/market-category";
import type { UsEquityPositionRow } from "@/lib/stocks-etfs/types";
import { cn } from "@/lib/utils";
import type { HoldingsDisplayMode } from "./HoldingsDisplayToggle";

interface UsEquityHoldingsViewsProps {
  rows: UsEquityPositionRow[];
  label: string;
  mode: HoldingsDisplayMode;
}

function Empty({ label }: { label: string }) {
  return (
    <p className="text-sm text-terminal-muted">No {label} positions yet.</p>
  );
}

function pnlClass(value: number) {
  return value >= 0 ? "text-profit" : "text-loss";
}

function SummaryTable({ rows }: { rows: UsEquityPositionRow[] }) {
  return (
    <div className="rounded-lg border border-terminal-border w-full">
      <table className="w-full table-fixed text-xs">
        <thead className="bg-terminal-elevated/40 border-b border-terminal-border">
          <tr>
            {[
              "Ticker",
              "Value",
              "Unrl %",
              "Premium",
              "Div",
              "P/L",
              "ROI",
            ].map((h) => (
              <th
                key={h}
                className="px-1.5 py-2 text-left text-[9px] sm:text-[10px] font-medium uppercase tracking-wider text-terminal-muted truncate"
              >
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr
              key={row.ticker}
              className="border-b border-terminal-border/50 hover:bg-terminal-elevated/20"
            >
              <td className="px-1.5 py-2 font-mono font-semibold truncate">
                {row.ticker}
              </td>
              <td className="px-1.5 py-2 font-mono truncate">
                {formatTickerCurrency(row.currentAssetValue)}
              </td>
              <td className="px-1.5 py-2 font-mono truncate">
                {formatRoiPct(row.unrealizedPnlPct)}
              </td>
              <td className="px-1.5 py-2 font-mono truncate">
                {formatTickerCurrency(row.premiumCollected)}
              </td>
              <td className="px-1.5 py-2 font-mono truncate">
                {formatTickerCurrency(row.dividendIncome)}
              </td>
              <td
                className={cn(
                  "px-1.5 py-2 font-mono truncate",
                  pnlClass(row.totalPnl)
                )}
              >
                {formatSignedTickerCurrency(row.totalPnl)}
              </td>
              <td className="px-1.5 py-2 font-mono truncate">
                {formatRoiPct(row.roiPct)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function DetailedTable({ rows }: { rows: UsEquityPositionRow[] }) {
  return (
    <div className="overflow-x-auto rounded-lg border border-terminal-border">
      <table className="w-full min-w-[1400px] text-xs">
        <thead className="bg-terminal-elevated/40 border-b border-terminal-border">
          <tr>
            {[
              "Ticker",
              "Shares",
              "Avg Cost",
              "Price",
              "Market Value",
              "Unrealized P/L",
              "Unrealized %",
              "Premium Collected",
              "Dividend Income",
              "Annual Premium",
              "Annual Dividend",
              "Income Yield %",
              "Adj. Cost Basis",
              "Total P/L",
              "ROI %",
              "Open",
              "Closed",
            ].map((h) => (
              <th
                key={h}
                className="px-2 py-2 text-left text-[10px] font-medium uppercase tracking-wider text-terminal-muted whitespace-nowrap"
              >
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr
              key={row.ticker}
              className="border-b border-terminal-border/50 hover:bg-terminal-elevated/20"
            >
              <td className="px-2 py-2 font-mono font-semibold whitespace-nowrap">
                {row.ticker}
              </td>
              <td className="px-2 py-2 font-mono whitespace-nowrap">
                {row.shares || "—"}
              </td>
              <td className="px-2 py-2 font-mono whitespace-nowrap">
                {row.averageCost != null
                  ? formatTickerCurrency(row.averageCost)
                  : "—"}
              </td>
              <td className="px-2 py-2 font-mono whitespace-nowrap">
                {row.currentPrice != null
                  ? `$${row.currentPrice.toFixed(2)}`
                  : "—"}
              </td>
              <td className="px-2 py-2 font-mono whitespace-nowrap">
                {formatTickerCurrency(row.currentAssetValue)}
              </td>
              <td
                className={cn(
                  "px-2 py-2 font-mono whitespace-nowrap",
                  pnlClass(row.unrealizedPnl)
                )}
              >
                {formatSignedTickerCurrency(row.unrealizedPnl)}
              </td>
              <td className="px-2 py-2 font-mono whitespace-nowrap">
                {formatRoiPct(row.unrealizedPnlPct)}
              </td>
              <td className="px-2 py-2 font-mono whitespace-nowrap">
                {formatTickerCurrency(row.premiumCollected)}
              </td>
              <td className="px-2 py-2 font-mono whitespace-nowrap">
                {formatTickerCurrency(row.dividendIncome)}
              </td>
              <td className="px-2 py-2 font-mono whitespace-nowrap">
                {formatTickerCurrency(row.annualPremiumIncome)}
              </td>
              <td className="px-2 py-2 font-mono whitespace-nowrap">
                {formatTickerCurrency(row.annualDividendIncome)}
              </td>
              <td className="px-2 py-2 font-mono whitespace-nowrap">
                {formatIncomeYieldPct(row.incomeYieldPct)}
              </td>
              <td className="px-2 py-2 font-mono whitespace-nowrap">
                {formatTickerCurrency(row.adjustedCostBasis)}
              </td>
              <td
                className={cn(
                  "px-2 py-2 font-mono whitespace-nowrap",
                  pnlClass(row.totalPnl)
                )}
              >
                {formatSignedTickerCurrency(row.totalPnl)}
              </td>
              <td className="px-2 py-2 font-mono whitespace-nowrap">
                {formatRoiPct(row.roiPct)}
              </td>
              <td className="px-2 py-2 font-mono whitespace-nowrap">
                {row.openTradesCount}
              </td>
              <td className="px-2 py-2 font-mono whitespace-nowrap">
                {row.closedTradesCount}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function CardGrid({ rows }: { rows: UsEquityPositionRow[] }) {
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {rows.map((row) => (
        <div
          key={row.ticker}
          className="rounded-lg border border-terminal-border bg-terminal-surface p-4 space-y-3"
        >
          <div className="flex items-start justify-between gap-2">
            <div>
              <p className="font-mono text-lg font-semibold">{row.ticker}</p>
              <p className="text-[10px] text-terminal-muted">
                {categoryLabel(row.category)}
              </p>
            </div>
            <p className={cn("font-mono text-sm font-semibold", pnlClass(row.totalPnl))}>
              {formatSignedTickerCurrency(row.totalPnl)}
            </p>
          </div>
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div>
              <p className="text-[10px] uppercase text-terminal-muted">Value</p>
              <p className="font-mono">{formatTickerCurrency(row.currentAssetValue)}</p>
            </div>
            <div>
              <p className="text-[10px] uppercase text-terminal-muted">ROI</p>
              <p className="font-mono">{formatRoiPct(row.roiPct)}</p>
            </div>
            <div>
              <p className="text-[10px] uppercase text-terminal-muted">Premium</p>
              <p className="font-mono">{formatTickerCurrency(row.premiumCollected)}</p>
            </div>
            <div>
              <p className="text-[10px] uppercase text-terminal-muted">Dividend</p>
              <p className="font-mono">{formatTickerCurrency(row.dividendIncome)}</p>
            </div>
            <div className="col-span-2">
              <p className="text-[10px] uppercase text-terminal-muted">
                Income Yield
              </p>
              <p className="font-mono">{formatIncomeYieldPct(row.incomeYieldPct)}</p>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

export function UsEquityHoldingsViews({
  rows,
  label,
  mode,
}: UsEquityHoldingsViewsProps) {
  if (rows.length === 0) return <Empty label={label} />;

  switch (mode) {
    case "detailed":
      return <DetailedTable rows={rows} />;
    case "cards":
      return <CardGrid rows={rows} />;
    default:
      return <SummaryTable rows={rows} />;
  }
}
