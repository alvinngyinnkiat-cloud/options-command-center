"use client";

import type { ReactNode } from "react";
import { formatTickerCurrency } from "@/lib/ticker-positions/format";
import { PnlPercentValue, PnlValue } from "@/components/ui/PnlValue";
import { groupAllMarketRows, groupUsMarketRows } from "@/lib/ticker-positions/group-rows";
import type { SgMarketTickerRow, UsMarketTickerRow } from "@/lib/ticker-positions/market-types";

function CompactTable({
  headers,
  rows,
  emptyMessage = "No positions in this section.",
}: {
  headers: string[];
  rows: ReactNode[][];
  emptyMessage?: string;
}) {
  if (rows.length === 0) {
    return (
      <p className="text-sm text-terminal-muted py-3">{emptyMessage}</p>
    );
  }
  return (
    <div className="rounded-lg border border-terminal-border">
      <table className="w-full table-auto text-xs">
        <thead>
          <tr className="border-b border-terminal-border bg-terminal-elevated/80 text-left uppercase tracking-wider text-terminal-muted">
            {headers.map((h) => (
              <th key={h} className="px-2.5 py-2 font-medium">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr
              key={i}
              className="border-b border-terminal-border/50 hover:bg-terminal-elevated/30"
            >
              {row.map((cell, j) => (
                <td key={j} className="px-2.5 py-2 font-mono tabular-nums">
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function PositionSection({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <div className="space-y-2">
      <h3 className="text-[11px] font-medium uppercase tracking-wider text-terminal-muted">
        {title}
      </h3>
      {children}
    </div>
  );
}

function usEquityRows(rows: UsMarketTickerRow[]) {
  return rows.map((r) => [
    r.ticker,
    formatTickerCurrency(r.capitalDeployed),
    formatTickerCurrency(r.currentValue),
    <PnlValue key={`${r.ticker}-realized`} value={r.realizedPnl} />,
    <PnlValue key={`${r.ticker}-unrealized`} value={r.unrealizedPnl} />,
    <PnlValue key={`${r.ticker}-total`} value={r.totalPnl} />,
    <PnlPercentValue key={`${r.ticker}-roi`} value={r.roiPct} />,
    r.openTradesCount,
    r.closedTradesCount,
  ]);
}

const US_EQUITY_HEADERS = [
  "Ticker",
  "Capital Deployed",
  "Current Value",
  "Realized P/L",
  "Unrealized P/L",
  "Total P/L",
  "ROI %",
  "Open",
  "Closed",
];

const US_OPTIONS_HEADERS = [
  "Ticker",
  "Realized P/L",
  "Unrealized P/L",
  "Total P/L",
  "ROI %",
  "Open",
  "Closed",
];

const SG_HOLDINGS_HEADERS = [
  "Ticker",
  "Capital Deployed",
  "Current Value",
  "Realized P/L",
  "Unrealized P/L",
  "Total P/L",
  "ROI %",
];

function usOptionsRows(rows: UsMarketTickerRow[]) {
  return rows.map((r) => [
    r.ticker,
    <PnlValue key={`${r.ticker}-realized`} value={r.realizedPnl} />,
    <PnlValue key={`${r.ticker}-unrealized`} value={r.unrealizedPnl} />,
    <PnlValue key={`${r.ticker}-total`} value={r.totalPnl} />,
    <PnlPercentValue key={`${r.ticker}-roi`} value={r.roiPct} />,
    r.openTradesCount,
    r.closedTradesCount,
  ]);
}

function sgHoldingsRows(rows: SgMarketTickerRow[]) {
  return rows.map((r) => [
    r.ticker,
    formatTickerCurrency(r.capitalDeployed),
    formatTickerCurrency(r.currentValue),
    <PnlValue key={`${r.ticker}-realized`} value={r.realizedPnl} currency="SGD" />,
    <PnlValue key={`${r.ticker}-unrealized`} value={r.unrealizedPnl} currency="SGD" />,
    <PnlValue key={`${r.ticker}-total`} value={r.totalPnl} currency="SGD" />,
    <PnlPercentValue key={`${r.ticker}-roi`} value={r.roiPct} />,
  ]);
}

function UsMarketSections({ rows }: { rows: UsMarketTickerRow[] }) {
  const { etf, stock, options } = groupUsMarketRows(rows);

  return (
    <div className="space-y-6">
      <PositionSection title="ETF">
        <CompactTable headers={US_EQUITY_HEADERS} rows={usEquityRows(etf)} />
      </PositionSection>
      <PositionSection title="Stock">
        <CompactTable headers={US_EQUITY_HEADERS} rows={usEquityRows(stock)} />
      </PositionSection>
      <PositionSection title="Options">
        <CompactTable headers={US_OPTIONS_HEADERS} rows={usOptionsRows(options)} />
      </PositionSection>
    </div>
  );
}

function SgMarketSections({ rows }: { rows: SgMarketTickerRow[] }) {
  return (
    <div className="space-y-6">
      <PositionSection title="SG Stock / ETF">
        <CompactTable headers={SG_HOLDINGS_HEADERS} rows={sgHoldingsRows(rows)} />
      </PositionSection>
    </div>
  );
}

function AllMarketSections({
  usRows,
  sgRows,
}: {
  usRows: UsMarketTickerRow[];
  sgRows: SgMarketTickerRow[];
}) {
  const { etf, stock, options, sg } = groupAllMarketRows(usRows, sgRows);

  return (
    <div className="space-y-6">
      <PositionSection title="ETF">
        <CompactTable headers={US_EQUITY_HEADERS} rows={usEquityRows(etf)} />
      </PositionSection>
      <PositionSection title="Stock">
        <CompactTable headers={US_EQUITY_HEADERS} rows={usEquityRows(stock)} />
      </PositionSection>
      <PositionSection title="Options">
        <CompactTable headers={US_OPTIONS_HEADERS} rows={usOptionsRows(options)} />
      </PositionSection>
      <PositionSection title="SG Holdings">
        <CompactTable headers={SG_HOLDINGS_HEADERS} rows={sgHoldingsRows(sg)} />
      </PositionSection>
    </div>
  );
}

export function UsMarketGroupedTables({ rows }: { rows: UsMarketTickerRow[] }) {
  return <UsMarketSections rows={rows} />;
}

export function SgMarketGroupedTables({ rows }: { rows: SgMarketTickerRow[] }) {
  return <SgMarketSections rows={rows} />;
}

export function AllMarketGroupedTables({
  usRows,
  sgRows,
}: {
  usRows: UsMarketTickerRow[];
  sgRows: SgMarketTickerRow[];
}) {
  return <AllMarketSections usRows={usRows} sgRows={sgRows} />;
}
