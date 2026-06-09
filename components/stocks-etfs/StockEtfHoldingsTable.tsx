"use client";

import type { StockEtfHoldingsTableRow } from "@/lib/stocks-etfs/table-rows";
import {
  formatRoiPct,
  formatSignedTickerCurrency,
  formatTickerCurrency,
} from "@/lib/ticker-positions/format";
import { cn, formatSGD, formatSignedSGD } from "@/lib/utils";
import { getPnLColor } from "@/lib/format/pnl";
import { StockEtfPositionActionsMenu } from "./StockEtfPositionActionsMenu";

interface StockEtfHoldingsTableProps {
  rows: StockEtfHoldingsTableRow[];
  emptyLabel: string;
  onRefresh: () => void;
}

function formatMoney(row: StockEtfHoldingsTableRow, value: number): string {
  return row.currency === "SGD" ? formatSGD(value) : formatTickerCurrency(value);
}

function formatSignedMoney(row: StockEtfHoldingsTableRow, value: number): string {
  return row.currency === "SGD"
    ? formatSignedSGD(value)
    : formatSignedTickerCurrency(value);
}

function pnlClass(value: number) {
  return getPnLColor(value);
}

export function StockEtfHoldingsTable({
  rows,
  emptyLabel,
  onRefresh,
}: StockEtfHoldingsTableProps) {
  if (rows.length === 0) {
    return (
      <p className="text-sm text-terminal-muted">No {emptyLabel} positions yet.</p>
    );
  }

  return (
    <div className="rounded-lg border border-terminal-border w-full min-w-0">
      <table className="w-full table-fixed text-xs">
        <colgroup>
          <col className="w-[12%]" />
          <col className="w-[14%]" />
          <col className="w-[14%]" />
          <col className="w-[14%]" />
          <col className="w-[14%]" />
          <col className="w-[12%]" />
          <col className="w-[20%]" />
        </colgroup>
        <thead className="bg-terminal-elevated/40 border-b border-terminal-border">
          <tr>
            {[
              "Ticker",
              "Shares",
              "Capital",
              "Current Value",
              "Dividend",
              "P/L",
              "ROI",
              "Actions",
            ].map((header) => (
              <th
                key={header}
                className="px-2 py-2 text-left text-[9px] sm:text-[10px] font-medium uppercase tracking-wider text-terminal-muted"
              >
                {header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr
              key={row.id}
              className="border-b border-terminal-border/50 hover:bg-terminal-elevated/20"
            >
              <td className="px-2 py-2 font-mono font-semibold truncate">
                {row.ticker}
              </td>
              <td className="px-2 py-2 font-mono tabular-nums truncate">
                {row.shares > 0 ? row.shares.toLocaleString() : "—"}
              </td>
              <td className="px-2 py-2 font-mono tabular-nums truncate">
                {formatMoney(row, row.capital)}
              </td>
              <td className="px-2 py-2 font-mono tabular-nums truncate">
                {formatMoney(row, row.currentValue)}
              </td>
              <td
                className={cn(
                  "px-2 py-2 font-mono tabular-nums truncate",
                  pnlClass(row.dividend)
                )}
              >
                {formatSignedMoney(row, row.dividend)}
              </td>
              <td
                className={cn(
                  "px-2 py-2 font-mono tabular-nums truncate",
                  pnlClass(row.pl)
                )}
              >
                {formatSignedMoney(row, row.pl)}
              </td>
              <td
                className={cn(
                  "px-2 py-2 font-mono tabular-nums truncate",
                  pnlClass(row.roiPct)
                )}
              >
                {formatRoiPct(row.roiPct)}
              </td>
              <td className="px-2 py-2">
                <StockEtfPositionActionsMenu
                  holding={row.holding}
                  onRefresh={onRefresh}
                />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
