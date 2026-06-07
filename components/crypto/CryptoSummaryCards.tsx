import { StatCard } from "@/components/ui/StatCard";
import { formatSGD, formatSignedSGD } from "@/lib/utils";
import type { CryptoTrackerSummary } from "@/lib/crypto/types";

interface CryptoSummaryCardsProps {
  summary: CryptoTrackerSummary;
}

export function CryptoSummaryCards({ summary }: CryptoSummaryCardsProps) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
      <StatCard
        label="Total Invested SGD"
        value={formatSGD(summary.totalInvestedSgd)}
      />
      <StatCard
        label="Current Value SGD"
        value={formatSGD(summary.totalCurrentValueSgd)}
      />
      <StatCard
        label="Total P/L SGD"
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
        changeType={
          (summary.bestPerforming?.returnPct ?? 0) >= 0
            ? "positive"
            : "negative"
        }
      />
    </div>
  );
}
