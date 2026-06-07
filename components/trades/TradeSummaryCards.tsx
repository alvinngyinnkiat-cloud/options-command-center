import { StatCard } from "@/components/ui/StatCard";
import { formatCurrency, formatSignedCurrency } from "@/lib/trades/format";
import type { TradeTrackerSummary } from "@/lib/trades/types";

interface TradeSummaryCardsProps {
  summary: TradeTrackerSummary;
}

export function TradeSummaryCards({ summary }: TradeSummaryCardsProps) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-8">
      <StatCard label="Open Trades" value={String(summary.openTrades)} />
      <StatCard label="Closed Trades" value={String(summary.closedTrades)} />
      <StatCard
        label="Total Open Risk"
        value={formatCurrency(summary.totalOpenRisk)}
      />
      <StatCard
        label="Premium Collected"
        value={formatCurrency(summary.totalPremiumCollected)}
      />
      <StatCard
        label="My Unrealized P/L"
        value={formatSignedCurrency(summary.myCurrentPnl)}
        changeType={summary.myCurrentPnl >= 0 ? "positive" : "negative"}
      />
      <StatCard
        label="My Realized P/L"
        value={formatSignedCurrency(summary.myRealizedPnl)}
        changeType={summary.myRealizedPnl >= 0 ? "positive" : "negative"}
      />
      <StatCard
        label="Client P/L Owed"
        value={formatSignedCurrency(summary.clientPnlOwed)}
        change="Open client share"
        changeType={summary.clientPnlOwed >= 0 ? "positive" : "negative"}
      />
      <StatCard
        label="Win Rate"
        value={`${summary.winRate.toFixed(0)}%`}
        change={summary.closedTrades > 0 ? `${summary.closedTrades} closed` : "No closed trades"}
      />
    </div>
  );
}
