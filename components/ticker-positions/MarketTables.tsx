"use client";

import {
  formatIncomeYieldPct,
  formatRoiPct,
  formatSignedTickerCurrency,
  formatTickerCurrency,
} from "@/lib/ticker-positions/format";
import type {
  SgMarketSummary,
  SgMarketTickerRow,
  UsMarketSummary,
  UsMarketTickerRow,
} from "@/lib/ticker-positions/market-types";
import { StatCard } from "@/components/ui/StatCard";

function DataTable({
  headers,
  rows,
}: {
  headers: string[];
  rows: (string | number)[][];
}) {
  if (rows.length === 0) {
    return (
      <p className="text-sm text-terminal-muted py-4">No positions in this market.</p>
    );
  }
  return (
    <div className="overflow-x-auto rounded-lg border border-terminal-border">
      <table className="w-full min-w-[1200px] text-xs">
        <thead>
          <tr className="border-b border-terminal-border bg-terminal-elevated/80 text-left uppercase tracking-wider text-terminal-muted">
            {headers.map((h) => (
              <th key={h} className="px-3 py-2.5 font-medium whitespace-nowrap">
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
                <td key={j} className="px-3 py-2 font-mono whitespace-nowrap">
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

export function UsMarketSummaryCards({ summary }: { summary: UsMarketSummary }) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-8">
      <StatCard
        label="Total US Market Value"
        value={formatTickerCurrency(summary.totalMarketValue)}
      />
      <StatCard
        label="Total Premium Collected"
        value={formatTickerCurrency(summary.totalPremiumCollected)}
      />
      <StatCard
        label="Total Dividend Income"
        value={formatTickerCurrency(summary.totalDividendIncome)}
      />
      <StatCard
        label="Total Passive Income"
        value={formatTickerCurrency(summary.totalPassiveIncome)}
      />
      <StatCard
        label="Avg Income Yield"
        value={formatIncomeYieldPct(summary.averageIncomeYieldPct)}
      />
      <StatCard
        label="Total US P/L"
        value={formatSignedTickerCurrency(summary.totalPnl)}
        changeType={summary.totalPnl >= 0 ? "positive" : "negative"}
      />
      <StatCard
        label="Best US Ticker"
        value={summary.bestTicker?.ticker ?? "—"}
        change={
          summary.bestTicker
            ? formatSignedTickerCurrency(summary.bestTicker.totalPnl)
            : undefined
        }
        changeType="positive"
      />
      <StatCard
        label="Worst US Ticker"
        value={summary.worstTicker?.ticker ?? "—"}
        change={
          summary.worstTicker
            ? formatSignedTickerCurrency(summary.worstTicker.totalPnl)
            : undefined
        }
        changeType="negative"
      />
    </div>
  );
}

export function SgMarketSummaryCards({ summary }: { summary: SgMarketSummary }) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-7">
      <StatCard
        label="Total SG Market Value"
        value={formatTickerCurrency(summary.totalMarketValue)}
      />
      <StatCard
        label="Total Dividend Income"
        value={formatTickerCurrency(summary.totalDividendIncome)}
      />
      <StatCard
        label="Total Passive Income"
        value={formatTickerCurrency(summary.totalPassiveIncome)}
      />
      <StatCard
        label="Avg Income Yield"
        value={formatIncomeYieldPct(summary.averageIncomeYieldPct)}
      />
      <StatCard
        label="Total SG P/L"
        value={formatSignedTickerCurrency(summary.totalPnl)}
        changeType={summary.totalPnl >= 0 ? "positive" : "negative"}
      />
      <StatCard
        label="Best SG Ticker"
        value={summary.bestTicker?.ticker ?? "—"}
        change={
          summary.bestTicker
            ? formatSignedTickerCurrency(summary.bestTicker.totalPnl)
            : undefined
        }
        changeType="positive"
      />
      <StatCard
        label="Worst SG Ticker"
        value={summary.worstTicker?.ticker ?? "—"}
        change={
          summary.worstTicker
            ? formatSignedTickerCurrency(summary.worstTicker.totalPnl)
            : undefined
        }
        changeType="negative"
      />
    </div>
  );
}

export function UsMarketTable({ rows }: { rows: UsMarketTickerRow[] }) {
  return (
    <DataTable
      headers={[
        "Ticker",
        "Category",
        "Current Value",
        "Capital Deployed",
        "Premium Collected",
        "Dividend Income",
        "Annual Premium",
        "Annual Dividend",
        "Income Yield %",
        "Adjusted Cost Basis",
        "Realized P/L",
        "Unrealized P/L",
        "Total P/L",
        "ROI %",
        "Open",
        "Closed",
      ]}
      rows={rows.map((r) => [
        r.ticker,
        r.category,
        formatTickerCurrency(r.currentValue),
        formatTickerCurrency(r.capitalDeployed),
        formatTickerCurrency(r.premiumCollected),
        formatTickerCurrency(r.dividendIncome),
        formatTickerCurrency(r.annualPremiumIncome),
        formatTickerCurrency(r.annualDividendIncome),
        formatIncomeYieldPct(r.incomeYieldPct),
        formatTickerCurrency(r.adjustedCostBasis),
        formatSignedTickerCurrency(r.realizedPnl),
        formatSignedTickerCurrency(r.unrealizedPnl),
        formatSignedTickerCurrency(r.totalPnl),
        formatRoiPct(r.roiPct),
        r.openTradesCount,
        r.closedTradesCount,
      ])}
    />
  );
}

export function SgMarketTable({ rows }: { rows: SgMarketTickerRow[] }) {
  return (
    <DataTable
      headers={[
        "Ticker",
        "Category",
        "Current Value",
        "Capital Deployed",
        "Dividend Income",
        "Annual Dividend",
        "Dividend Yield",
        "Income Yield %",
        "Adjusted Cost Basis",
        "Realized P/L",
        "Unrealized P/L",
        "Total P/L",
        "ROI %",
      ]}
      rows={rows.map((r) => [
        r.ticker,
        r.category,
        formatTickerCurrency(r.currentValue),
        formatTickerCurrency(r.capitalDeployed),
        formatTickerCurrency(r.dividendIncome),
        formatTickerCurrency(r.annualDividendIncome),
        r.dividendYield != null ? formatIncomeYieldPct(r.dividendYield) : "—",
        formatIncomeYieldPct(r.incomeYieldPct),
        formatTickerCurrency(r.adjustedCostBasis),
        formatSignedTickerCurrency(r.realizedPnl),
        formatSignedTickerCurrency(r.unrealizedPnl),
        formatSignedTickerCurrency(r.totalPnl),
        formatRoiPct(r.roiPct),
      ])}
    />
  );
}
