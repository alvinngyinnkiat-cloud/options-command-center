import { StatCard } from "@/components/ui/StatCard";
import {
  getPnLChangeType,
  pnlPercentStatProps,
  pnlStatProps,
} from "@/lib/format/pnl";
import { formatSGD } from "@/lib/utils";
import type { StockEtfTrackerSummary } from "@/lib/stocks-etfs/types";

interface StockEtfSummaryCardsProps {
  summary: StockEtfTrackerSummary;
}

export function StockEtfSummaryCards({ summary }: StockEtfSummaryCardsProps) {
  const totalPnl = pnlStatProps(summary.totalProfitLossSgd, { currency: "SGD" });
  const totalReturn = pnlPercentStatProps(summary.totalReturnPct, 1);
  const bestReturn = summary.bestPerforming
    ? pnlPercentStatProps(summary.bestPerforming.returnPct, 1)
    : null;
  const worstReturn = summary.worstPerforming
    ? pnlPercentStatProps(summary.worstPerforming.returnPct, 1)
    : null;

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
        value={totalPnl.value}
        valueClassName={totalPnl.valueClassName}
        changeType={totalPnl.changeType}
      />
      <StatCard
        label="Total Return %"
        value={totalReturn.value}
        valueClassName={totalReturn.valueClassName}
        changeType={totalReturn.changeType}
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
        change={bestReturn?.value}
        valueClassName={bestReturn?.valueClassName}
        changeType={bestReturn?.changeType ?? getPnLChangeType(0)}
      />
      <StatCard
        label="Worst Performer"
        value={summary.worstPerforming?.ticker ?? "—"}
        change={worstReturn?.value}
        valueClassName={worstReturn?.valueClassName}
        changeType={worstReturn?.changeType ?? getPnLChangeType(0)}
      />
    </div>
  );
}
