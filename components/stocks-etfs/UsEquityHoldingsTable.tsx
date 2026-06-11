"use client";

import {
  formatRoiPct,
  formatSignedTickerCurrency,
  formatTickerCurrency,
} from "@/lib/ticker-positions/format";
import type { UsEquityPositionRow } from "@/lib/stocks-etfs/types";
import { cn } from "@/lib/utils";

interface UsEquityHoldingsTableProps {
  rows: UsEquityPositionRow[];
  label: string;
}

function Th({ children }: { children: React.ReactNode }) {
  return (
    <th className="px-2 py-2 text-left text-[10px] font-medium uppercase tracking-wider text-terminal-muted whitespace-nowrap">
      {children}
    </th>
  );
}

function Td({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <td className={cn("px-2 py-2 font-mono text-xs whitespace-nowrap", className)}>
      {children}
    </td>
  );
}

export function UsEquityHoldingsTable({
  rows,
  label,
}: UsEquityHoldingsTableProps) {
  if (rows.length === 0) {
    return (
      <p className="text-sm text-terminal-muted">
        No holdings recorded yet.
      </p>
    );
  }

  return (
    <div className="overflow-x-auto rounded-lg border border-terminal-border">
      <table className="w-full min-w-[1200px] text-sm">
        <thead className="bg-terminal-elevated/40 border-b border-terminal-border">
          <tr>
            <Th>Ticker</Th>
            <Th>Shares</Th>
            <Th>Avg Cost</Th>
            <Th>Price</Th>
            <Th>Market Value</Th>
            <Th>Unrealized P/L</Th>
            <Th>Unrealized %</Th>
            <Th>Premium Collected</Th>
            <Th>Realized Premium</Th>
            <Th>Open Premium</Th>
            <Th>Adj. Cost Basis</Th>
            <Th>Net Position P/L</Th>
            <Th>Return %</Th>
            <Th>Options</Th>
            <Th>LEAPS Value</Th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr
              key={row.ticker}
              className="border-b border-terminal-border/50 hover:bg-terminal-elevated/20"
            >
              <Td className="font-semibold">{row.ticker}</Td>
              <Td>{row.shares || "—"}</Td>
              <Td>
                {row.averageCost != null
                  ? formatTickerCurrency(row.averageCost)
                  : "—"}
              </Td>
              <Td>
                {row.currentPrice != null
                  ? `$${row.currentPrice.toFixed(2)}`
                  : "—"}
              </Td>
              <Td>{formatTickerCurrency(row.marketValue)}</Td>
              <Td
                className={
                  row.unrealizedPnl >= 0 ? "text-profit" : "text-loss"
                }
              >
                {formatSignedTickerCurrency(row.unrealizedPnl)}
              </Td>
              <Td>{formatRoiPct(row.unrealizedPnlPct)}</Td>
              <Td>{formatTickerCurrency(row.premiumCollected)}</Td>
              <Td>{formatSignedTickerCurrency(row.realizedPremiumIncome)}</Td>
              <Td>{formatSignedTickerCurrency(row.openPremiumIncome)}</Td>
              <Td>{formatTickerCurrency(row.adjustedCostBasis)}</Td>
              <Td
                className={
                  row.netPositionPnl >= 0 ? "text-profit" : "text-loss"
                }
              >
                {formatSignedTickerCurrency(row.netPositionPnl)}
              </Td>
              <Td>{formatRoiPct(row.totalReturnPct)}</Td>
              <Td>{row.associatedOptionsTrades.length}</Td>
              <Td>{formatTickerCurrency(row.leapsValue)}</Td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
