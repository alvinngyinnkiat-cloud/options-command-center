import { MetricCardsGrid } from "@/components/ui/MetricCardsGrid";
import { StatCard } from "@/components/ui/StatCard";
import { formatRiskCurrency } from "@/lib/risk/format";
import type { ClientProfitSharingSummary } from "@/lib/client-profit-sharing/types";

interface ClientLifetimeSummaryProps {
  summary: ClientProfitSharingSummary;
}

export function ClientLifetimeSummary({ summary }: ClientLifetimeSummaryProps) {
  return (
    <MetricCardsGrid>
      <StatCard
        label="Lifetime Profit"
        value={formatRiskCurrency(summary.lifetimeTradeProfit)}
        changeType="neutral"
      />
      <StatCard
        label="Lifetime Client Share"
        value={formatRiskCurrency(summary.lifetimeClientShare)}
        changeType="positive"
        valueClassName="text-profit"
      />
      <StatCard
        label="Lifetime My Share"
        value={formatRiskCurrency(summary.lifetimeMyShare)}
        changeType="neutral"
        valueClassName="text-accent"
      />
      <StatCard
        label="Paid To Client"
        value={formatRiskCurrency(summary.totalPaidToClient)}
        changeType="neutral"
      />
    </MetricCardsGrid>
  );
}
