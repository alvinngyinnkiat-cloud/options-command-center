"use client";

import {
  formatIncomeYieldPct,
  formatTickerCurrency,
} from "@/lib/ticker-positions/format";
import {
  getPnLChangeType,
  pnlStatProps,
} from "@/lib/format/pnl";
import { PnlValue } from "@/components/ui/PnlValue";
import type {
  AllMarketSummary,
  IncomeTabSummary,
  PassiveIncomeGoalProgress,
  SgMarketSummary,
  UnifiedMarketTickerRow,
  UsMarketSummary,
} from "@/lib/ticker-positions/market-types";
import { StatCard, SUMMARY_METRIC_GRID } from "@/components/ui/StatCard";
import { formatSGD } from "@/lib/utils";

export function AllMarketSummaryCards({ summary }: { summary: AllMarketSummary }) {
  const totalPnl = pnlStatProps(summary.totalPnl);
  const bestPnl = summary.bestTicker
    ? pnlStatProps(summary.bestTicker.totalPnl, {
        currency: summary.bestTicker.market === "SG" ? "SGD" : "USD",
      })
    : null;
  const worstPnl = summary.worstTicker
    ? pnlStatProps(summary.worstTicker.totalPnl, {
        currency: summary.worstTicker.market === "SG" ? "SGD" : "USD",
      })
    : null;

  return (
    <div className={SUMMARY_METRIC_GRID}>
      <StatCard
        label="Total Market Value"
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
        label="Total P/L"
        value={totalPnl.value}
        valueClassName={totalPnl.valueClassName}
        changeType={totalPnl.changeType}
      />
      <StatCard
        label="Best Ticker"
        value={summary.bestTicker?.ticker ?? "—"}
        change={bestPnl?.value}
        valueClassName={bestPnl?.valueClassName}
        changeType={bestPnl?.changeType ?? getPnLChangeType(0)}
      />
      <StatCard
        label="Worst Ticker"
        value={summary.worstTicker?.ticker ?? "—"}
        change={worstPnl?.value}
        valueClassName={worstPnl?.valueClassName}
        changeType={worstPnl?.changeType ?? getPnLChangeType(0)}
      />
    </div>
  );
}

export function UsMarketSummaryCards({ summary }: { summary: UsMarketSummary }) {
  const totalPnl = pnlStatProps(summary.totalPnl);
  const bestPnl = summary.bestTicker
    ? pnlStatProps(summary.bestTicker.totalPnl)
    : null;
  const worstPnl = summary.worstTicker
    ? pnlStatProps(summary.worstTicker.totalPnl)
    : null;

  return (
    <div className={SUMMARY_METRIC_GRID}>
      <StatCard
        label="Total Market Value"
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
        label="Total P/L"
        value={totalPnl.value}
        valueClassName={totalPnl.valueClassName}
        changeType={totalPnl.changeType}
      />
      <StatCard
        label="Best Ticker"
        value={summary.bestTicker?.ticker ?? "—"}
        change={bestPnl?.value}
        valueClassName={bestPnl?.valueClassName}
        changeType={bestPnl?.changeType ?? getPnLChangeType(0)}
      />
      <StatCard
        label="Worst Ticker"
        value={summary.worstTicker?.ticker ?? "—"}
        change={worstPnl?.value}
        valueClassName={worstPnl?.valueClassName}
        changeType={worstPnl?.changeType ?? getPnLChangeType(0)}
      />
    </div>
  );
}

export function SgMarketSummaryCards({ summary }: { summary: SgMarketSummary }) {
  const totalPnl = pnlStatProps(summary.totalPnl, { currency: "SGD" });
  const bestPnl = summary.bestTicker
    ? pnlStatProps(summary.bestTicker.totalPnl, { currency: "SGD" })
    : null;
  const worstPnl = summary.worstTicker
    ? pnlStatProps(summary.worstTicker.totalPnl, { currency: "SGD" })
    : null;

  return (
    <div className={SUMMARY_METRIC_GRID}>
      <StatCard
        label="Total Market Value"
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
        label="Total P/L"
        value={totalPnl.value}
        valueClassName={totalPnl.valueClassName}
        changeType={totalPnl.changeType}
      />
      <StatCard
        label="Best Ticker"
        value={summary.bestTicker?.ticker ?? "—"}
        change={bestPnl?.value}
        valueClassName={bestPnl?.valueClassName}
        changeType={bestPnl?.changeType ?? getPnLChangeType(0)}
      />
      <StatCard
        label="Worst Ticker"
        value={summary.worstTicker?.ticker ?? "—"}
        change={worstPnl?.value}
        valueClassName={worstPnl?.valueClassName}
        changeType={worstPnl?.changeType ?? getPnLChangeType(0)}
      />
    </div>
  );
}

function rowCurrency(row: UnifiedMarketTickerRow): "USD" | "SGD" {
  return row.currency;
}

export function IncomeSummaryCards({ summary }: { summary: IncomeTabSummary }) {
  return (
    <div className={SUMMARY_METRIC_GRID}>
      <StatCard
        label="Total Passive Income"
        value={formatTickerCurrency(summary.totalPassiveIncome)}
        change="Annual premium + dividend"
      />
      <StatCard
        label="Annual Premium Income"
        value={formatTickerCurrency(summary.annualPremiumIncome)}
        change="US options only"
      />
      <StatCard
        label="Annual Dividend Income"
        value={formatTickerCurrency(summary.annualDividendIncome)}
        change="US + SG"
      />
      <StatCard
        label="Average Income Yield %"
        value={formatIncomeYieldPct(summary.averageIncomeYieldPct)}
      />
      <StatCard
        label="Best Income Generator"
        value={summary.bestIncomeGenerator?.ticker ?? "—"}
        change={
          summary.bestIncomeGenerator
            ? formatTickerCurrency(summary.bestIncomeGenerator.totalPassiveIncome)
            : undefined
        }
      />
      <StatCard
        label="Highest Yield Position"
        value={summary.highestYieldPosition?.ticker ?? "—"}
        change={
          summary.highestYieldPosition
            ? formatIncomeYieldPct(summary.highestYieldPosition.incomeYieldPct)
            : undefined
        }
      />
      <StatCard
        label="Monthly Passive Income Est."
        value={formatTickerCurrency(summary.monthlyPassiveIncomeEstimate)}
      />
      <StatCard
        label="Annual Passive Income Est."
        value={formatTickerCurrency(summary.annualPassiveIncomeEstimate)}
      />
    </div>
  );
}

export function PassiveIncomeGoalCard({
  goal,
}: {
  goal: PassiveIncomeGoalProgress;
}) {
  return (
    <div className="rounded-lg border border-terminal-border bg-terminal-elevated/30 p-4">
      <h3 className="mb-3 text-xs font-medium uppercase tracking-wider text-terminal-muted">
        Passive Income Goal Progress
      </h3>
      <div className={SUMMARY_METRIC_GRID}>
        <StatCard
          label="Current Monthly Passive Income"
          value={formatSGD(goal.currentMonthlySgd)}
        />
        <StatCard
          label="Target Monthly Passive Income"
          value={formatSGD(goal.targetMonthlySgd)}
        />
        <StatCard
          label="Progress"
          value={`${goal.progressPercent.toFixed(1)}%`}
        />
        <StatCard
          label="Remaining To Goal"
          value={formatSGD(goal.remainingMonthlySgd)}
        />
      </div>
    </div>
  );
}

export function IncomeTable({ rows }: { rows: UnifiedMarketTickerRow[] }) {
  if (rows.length === 0) {
    return (
      <p className="text-sm text-terminal-muted py-4">No income positions match this filter.</p>
    );
  }

  const headers = [
    "Ticker",
    "Market",
    "Current Value",
    "Adjusted Cost Basis",
    "Premium Income",
    "Dividend Income",
    "Annual Premium",
    "Annual Dividend",
    "Total Passive Income",
    "Income Yield %",
    "Capital Gain/Loss",
    "Total Return",
  ];

  return (
    <div className="overflow-x-auto rounded-lg border border-terminal-border">
      <table className="w-full min-w-[960px] text-xs">
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
          {rows.map((r) => (
            <tr
              key={`${r.market}-${r.ticker}`}
              className="border-b border-terminal-border/50 hover:bg-terminal-elevated/30"
            >
              <td className="px-3 py-2 font-mono">{r.ticker}</td>
              <td className="px-3 py-2 font-mono">{r.market}</td>
              <td className="px-3 py-2 font-mono">{formatTickerCurrency(r.currentValue)}</td>
              <td className="px-3 py-2 font-mono">{formatTickerCurrency(r.adjustedCostBasis)}</td>
              <td className="px-3 py-2 font-mono">
                {r.market === "US" ? formatTickerCurrency(r.premiumCollected) : "—"}
              </td>
              <td className="px-3 py-2 font-mono">{formatTickerCurrency(r.dividendIncome)}</td>
              <td className="px-3 py-2 font-mono">
                {r.market === "US" ? formatTickerCurrency(r.annualPremiumIncome) : "—"}
              </td>
              <td className="px-3 py-2 font-mono">{formatTickerCurrency(r.annualDividendIncome)}</td>
              <td className="px-3 py-2 font-mono">{formatTickerCurrency(r.totalPassiveIncome)}</td>
              <td className="px-3 py-2 font-mono">{formatIncomeYieldPct(r.incomeYieldPct)}</td>
              <td className="px-3 py-2 font-mono">
                <PnlValue value={r.capitalGainLoss} currency={rowCurrency(r)} />
              </td>
              <td className="px-3 py-2 font-mono">
                <PnlValue value={r.totalReturn} currency={rowCurrency(r)} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
