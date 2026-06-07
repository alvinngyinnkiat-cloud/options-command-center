import { StatCard } from "@/components/ui/StatCard";
import { formatSGD, formatSignedSGD } from "@/lib/utils";
import type { StockEtfTrackerSummary } from "@/lib/stocks-etfs/types";

interface StockEtfSummaryCardsProps {
  summary: StockEtfTrackerSummary;
}

export function StockEtfSummaryCards({ summary }: StockEtfSummaryCardsProps) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-7">
      <StatCard
        label="Total Invested"
        value={formatSGD(summary.totalInvestedSgd)}
      />
      <StatCard
        label="Current Value"
        value={formatSGD(summary.totalCurrentValueSgd)}
      />
      <StatCard
        label="Total P/L"
        value={formatSignedSGD(summary.totalProfitLossSgd)}
        changeType={
          summary.totalProfitLossSgd >= 0 ? "positive" : "negative"
        }
      />
      <StatCard
        label="Total Return %"
        value={`${summary.totalReturnPct.toFixed(1)}%`}
        changeType={summary.totalReturnPct >= 0 ? "positive" : "negative"}
      />
      <StatCard
        label="Largest Holding"
        value={summary.largestHolding?.ticker ?? "—"}
        change={
          summary.largestHolding
            ? formatSGD(summary.largestHolding.valueSgd)
            : undefined
        }
      />
      <StatCard
        label="Best Performer"
        value={summary.bestPerforming?.ticker ?? "—"}
        change={
          summary.bestPerforming
            ? `${summary.bestPerforming.returnPct.toFixed(1)}%`
            : undefined
        }
        changeType="positive"
      />
      <StatCard
        label="Worst Performer"
        value={summary.worstPerforming?.ticker ?? "—"}
        change={
          summary.worstPerforming
            ? `${summary.worstPerforming.returnPct.toFixed(1)}%`
            : undefined
        }
        changeType="negative"
      />
    </div>
  );
}
