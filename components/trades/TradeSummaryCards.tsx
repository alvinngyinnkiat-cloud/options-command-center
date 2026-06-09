import { MetricCardsGrid } from "@/components/ui/MetricCardsGrid";
import { StatCard } from "@/components/ui/StatCard";
import { formatCurrencyAmount } from "@/lib/format/currency";
import {
  getPnLChangeType,
  getPnLColor,
  pnlStatProps,
} from "@/lib/format/pnl";
import { TRADE_TRACKER_PNL_DECIMALS } from "@/lib/trades/constants";
import { formatCurrency, formatTradeTrackerPnl } from "@/lib/trades/format";
import type { TradeTrackerSummary } from "@/lib/trades/types";

interface TradeSummaryCardsProps {
  summary: TradeTrackerSummary;
}

const pnlOpts = { currency: "USD" as const, decimals: TRADE_TRACKER_PNL_DECIMALS };

export function TradeSummaryCards({ summary }: TradeSummaryCardsProps) {
  const totalPnl = pnlStatProps(summary.totalPnl, pnlOpts);
  const clientPnl = pnlStatProps(summary.clientPnl, pnlOpts);
  const myPnl = pnlStatProps(summary.myPnl, pnlOpts);
  const avgProfitDisplay = formatCurrencyAmount(
    Math.abs(summary.averageProfit),
    "USD",
    TRADE_TRACKER_PNL_DECIMALS
  );
  const avgLossDisplay = formatCurrencyAmount(
    Math.abs(summary.averageLoss),
    "USD",
    TRADE_TRACKER_PNL_DECIMALS
  );

  return (
    <MetricCardsGrid>
      <StatCard
        label="Total P/L"
        value={totalPnl.value}
        change={`Realized ${formatTradeTrackerPnl(summary.totalRealizedPnl)} · Unrealized ${formatTradeTrackerPnl(summary.totalUnrealizedPnl)}`}
        valueClassName={totalPnl.valueClassName}
        changeType={totalPnl.changeType}
      />
      <StatCard
        label="Client P/L"
        value={clientPnl.value}
        change={`Realized ${formatTradeTrackerPnl(summary.clientRealizedPnl)} · Unrealized ${formatTradeTrackerPnl(summary.clientUnrealizedPnl)}`}
        valueClassName={clientPnl.valueClassName}
        changeType={clientPnl.changeType}
      />
      <StatCard
        label="My P/L"
        value={myPnl.value}
        change={`Realized ${formatTradeTrackerPnl(summary.myRealizedPnl)} · Unrealized ${formatTradeTrackerPnl(summary.myUnrealizedPnl)}`}
        valueClassName={myPnl.valueClassName}
        changeType={myPnl.changeType}
      />
      <StatCard
        label="Total Trades"
        value={String(summary.totalTrades)}
        change={`${summary.openTrades} open · ${summary.closedTrades} closed`}
        changeType="neutral"
      />
      <StatCard label="Open Trades" value={String(summary.openTrades)} />
      <StatCard label="Closed Trades" value={String(summary.closedTrades)} />
      <StatCard
        label="Open Risk"
        value={formatCurrency(summary.totalOpenRisk)}
        changeType="neutral"
      />
      <StatCard
        label="Win Rate"
        value={`${summary.winRate.toFixed(0)}%`}
        change={
          summary.closedTrades > 0
            ? `${summary.profitTradesCount} wins / ${summary.closedTrades} closed`
            : "No closed trades"
        }
        valueClassName={getPnLColor(0)}
        changeType={getPnLChangeType(0)}
      />
      <StatCard
        label="Profit Trades / Avg Profit"
        value={`${summary.profitTradesCount} / US$${avgProfitDisplay}`}
        change={
          summary.profitTradesCount > 0
            ? "Closed winners"
            : "No winning closed trades"
        }
        valueClassName={getPnLColor(summary.averageProfit)}
        changeType={getPnLChangeType(summary.averageProfit)}
      />
      <StatCard
        label="Losing Trades / Avg Loss"
        value={`${summary.losingTradesCount} / -US$${avgLossDisplay}`}
        change={
          summary.losingTradesCount > 0
            ? "Closed losers"
            : "No losing closed trades"
        }
        valueClassName={getPnLColor(summary.averageLoss)}
        changeType={getPnLChangeType(summary.averageLoss)}
      />
    </MetricCardsGrid>
  );
}
