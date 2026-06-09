import { StatCard } from "@/components/ui/StatCard";
import { formatCurrency } from "@/lib/journal/format";
import {
  getPnLChangeType,
  getPnLColor,
  pnlStatProps,
} from "@/lib/format/pnl";
import type { JournalTrackerSummary } from "@/lib/journal/types";

interface JournalSummaryCardsProps {
  summary: JournalTrackerSummary;
}

export function JournalSummaryCards({ summary }: JournalSummaryCardsProps) {
  const netPnl = pnlStatProps(summary.myNetProfitLoss);
  const avgLoss = pnlStatProps(summary.averageLoss);

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-7">
      <StatCard label="Total Trades" value={String(summary.totalTrades)} />
      <StatCard
        label="Win Rate"
        value={`${summary.winRate.toFixed(0)}%`}
        change={`${summary.closedTrades} closed`}
        valueClassName={getPnLColor(0)}
        changeType={getPnLChangeType(0)}
      />
      <StatCard
        label="My Net P/L"
        value={netPnl.value}
        valueClassName={netPnl.valueClassName}
        changeType={netPnl.changeType}
      />
      <StatCard
        label="Avg Win"
        value={formatCurrency(summary.averageWin)}
        valueClassName={getPnLColor(summary.averageWin)}
        changeType={getPnLChangeType(summary.averageWin)}
      />
      <StatCard
        label="Avg Loss"
        value={avgLoss.value}
        valueClassName={avgLoss.valueClassName}
        changeType={avgLoss.changeType}
      />
      <StatCard
        label="Profit Factor"
        value={
          summary.profitFactor != null
            ? summary.profitFactor.toFixed(2)
            : summary.netProfitLoss > 0
              ? "∞"
              : "—"
        }
      />
      <StatCard
        label="Avg Days Held"
        value={summary.averageDaysHeld.toFixed(1)}
      />
    </div>
  );
}
