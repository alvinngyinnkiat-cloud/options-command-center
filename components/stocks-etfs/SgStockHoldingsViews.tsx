"use client";

import {
  formatIncomeYieldPct,
  formatRoiPct,
} from "@/lib/ticker-positions/format";
import type { SgStockRow } from "@/lib/stocks-etfs/types";
import { cn, formatSGD, formatSignedSGD } from "@/lib/utils";
import type { HoldingsDisplayMode } from "./HoldingsDisplayToggle";

interface SgStockHoldingsViewsProps {
  rows: SgStockRow[];
  mode: HoldingsDisplayMode;
}

function sgCategory(row: SgStockRow): string {
  if (row.holding.assetType === "etf") return "SG ETF";
  if (row.holding.sector?.toLowerCase().includes("reit")) return "SG REIT";
  return "SG Stock";
}

function pnlClass(value: number) {
  return value >= 0 ? "text-profit" : "text-loss";
}

function SummaryTable({ rows }: { rows: SgStockRow[] }) {
  return (
    <div className="rounded-lg border border-terminal-border w-full">
      <table className="w-full table-fixed text-xs">
        <thead className="bg-terminal-elevated/40 border-b border-terminal-border">
          <tr>
            {["Ticker", "Value", "Div", "Yield", "P/L", "ROI"].map((h) => (
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
              key={row.holding.id}
              className="border-b border-terminal-border/50 hover:bg-terminal-elevated/20"
            >
              <td className="px-1.5 py-2 font-mono font-semibold truncate">
                {row.holding.ticker}
              </td>
              <td className="px-1.5 py-2 font-mono truncate">
                {formatSGD(row.marketValue)}
              </td>
              <td className="px-1.5 py-2 font-mono truncate">
                {formatSGD(row.dividendIncome)}
              </td>
              <td className="px-1.5 py-2 font-mono truncate">
                {row.dividendYield != null
                  ? formatIncomeYieldPct(row.dividendYield)
                  : "—"}
              </td>
              <td
                className={cn(
                  "px-1.5 py-2 font-mono truncate",
                  pnlClass(row.totalPnl)
                )}
              >
                {formatSignedSGD(row.totalPnl)}
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

function DetailedTable({ rows }: { rows: SgStockRow[] }) {
  return (
    <div className="overflow-x-auto rounded-lg border border-terminal-border">
      <table className="w-full min-w-[1100px] text-xs">
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
              "Dividend Income",
              "Annual Dividend",
              "Dividend Yield",
              "Income Yield %",
              "Adj. Cost Basis",
              "Total P/L",
              "ROI %",
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
              key={row.holding.id}
              className="border-b border-terminal-border/50"
            >
              <td className="px-2 py-2 font-mono font-semibold whitespace-nowrap">
                {row.holding.ticker}
              </td>
              <td className="px-2 py-2 font-mono whitespace-nowrap">
                {row.shares}
              </td>
              <td className="px-2 py-2 font-mono whitespace-nowrap">
                {row.averageCost != null ? formatSGD(row.averageCost) : "—"}
              </td>
              <td className="px-2 py-2 font-mono whitespace-nowrap">
                {row.currentPrice != null
                  ? formatSGD(row.currentPrice)
                  : "—"}
              </td>
              <td className="px-2 py-2 font-mono whitespace-nowrap">
                {formatSGD(row.marketValue)}
              </td>
              <td
                className={cn(
                  "px-2 py-2 font-mono whitespace-nowrap",
                  pnlClass(row.unrealizedPnl)
                )}
              >
                {formatSignedSGD(row.unrealizedPnl)}
              </td>
              <td className="px-2 py-2 font-mono whitespace-nowrap">
                {row.unrealizedPnlPct.toFixed(1)}%
              </td>
              <td className="px-2 py-2 font-mono whitespace-nowrap">
                {formatSGD(row.dividendIncome)}
              </td>
              <td className="px-2 py-2 font-mono whitespace-nowrap">
                {row.annualDividendIncome != null
                  ? formatSGD(row.annualDividendIncome)
                  : "—"}
              </td>
              <td className="px-2 py-2 font-mono whitespace-nowrap">
                {row.dividendYield != null
                  ? formatIncomeYieldPct(row.dividendYield)
                  : "—"}
              </td>
              <td className="px-2 py-2 font-mono whitespace-nowrap">
                {formatIncomeYieldPct(row.incomeYieldPct)}
              </td>
              <td className="px-2 py-2 font-mono whitespace-nowrap">
                {formatSGD(row.adjustedCostBasis)}
              </td>
              <td
                className={cn(
                  "px-2 py-2 font-mono whitespace-nowrap",
                  pnlClass(row.totalPnl)
                )}
              >
                {formatSignedSGD(row.totalPnl)}
              </td>
              <td className="px-2 py-2 font-mono whitespace-nowrap">
                {formatRoiPct(row.roiPct)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function CardGrid({ rows }: { rows: SgStockRow[] }) {
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {rows.map((row) => (
        <div
          key={row.holding.id}
          className="rounded-lg border border-terminal-border bg-terminal-surface p-4 space-y-3"
        >
          <div className="flex items-start justify-between gap-2">
            <div>
              <p className="font-mono text-lg font-semibold">
                {row.holding.ticker}
              </p>
              <p className="text-[10px] text-terminal-muted">
                {sgCategory(row)}
              </p>
            </div>
            <p className={cn("font-mono text-sm font-semibold", pnlClass(row.totalPnl))}>
              {formatSignedSGD(row.totalPnl)}
            </p>
          </div>
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div>
              <p className="text-[10px] uppercase text-terminal-muted">Value</p>
              <p className="font-mono">{formatSGD(row.marketValue)}</p>
            </div>
            <div>
              <p className="text-[10px] uppercase text-terminal-muted">ROI</p>
              <p className="font-mono">{formatRoiPct(row.roiPct)}</p>
            </div>
            <div>
              <p className="text-[10px] uppercase text-terminal-muted">Premium</p>
              <p className="font-mono text-terminal-muted">—</p>
            </div>
            <div>
              <p className="text-[10px] uppercase text-terminal-muted">Dividend</p>
              <p className="font-mono">
                {row.annualDividendIncome != null
                  ? formatSGD(row.annualDividendIncome)
                  : "—"}
              </p>
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

export function SgStockHoldingsViews({ rows, mode }: SgStockHoldingsViewsProps) {
  if (rows.length === 0) {
    return (
      <p className="text-sm text-terminal-muted">No SG Stock holdings yet.</p>
    );
  }

  switch (mode) {
    case "detailed":
      return <DetailedTable rows={rows} />;
    case "cards":
      return <CardGrid rows={rows} />;
    default:
      return <SummaryTable rows={rows} />;
  }
}
