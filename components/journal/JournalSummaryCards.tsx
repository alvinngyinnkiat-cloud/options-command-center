import { StatCard } from "@/components/ui/StatCard";
import { formatCurrency, formatSignedCurrency } from "@/lib/journal/format";
import type { JournalTrackerSummary } from "@/lib/journal/types";

interface JournalSummaryCardsProps {
  summary: JournalTrackerSummary;
}

export function JournalSummaryCards({ summary }: JournalSummaryCardsProps) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-7">
      <StatCard label="Total Trades" value={String(summary.totalTrades)} />
      <StatCard
        label="Win Rate"
        value={`${summary.winRate.toFixed(0)}%`}
        change={`${summary.closedTrades} closed`}
      />
      <StatCard
        label="My Net P/L"
        value={formatSignedCurrency(summary.myNetProfitLoss)}
        changeType={summary.myNetProfitLoss >= 0 ? "positive" : "negative"}
      />
      <StatCard
        label="Avg Win"
        value={formatCurrency(summary.averageWin)}
        changeType="positive"
      />
      <StatCard
        label="Avg Loss"
        value={formatSignedCurrency(summary.averageLoss)}
        changeType="negative"
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
