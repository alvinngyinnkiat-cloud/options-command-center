import { StatCard } from "@/components/ui/StatCard";
import { formatRiskCurrency } from "@/lib/risk/format";
import type { ClientCapitalMetrics } from "@/lib/portfolio/client-capital";
import type { ClientProfitSharingSummary } from "@/lib/client-profit-sharing/types";
import { buildClientCapitalMetrics } from "@/lib/portfolio/client-capital";
import { formatReturnPercent } from "@/lib/utils";

interface ClientProfitSummaryCardsProps {
  summary: ClientProfitSharingSummary;
}

export function ClientProfitSummaryCards({
  summary,
}: ClientProfitSummaryCardsProps) {
  const capital: ClientCapitalMetrics = buildClientCapitalMetrics(summary);

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-8">
      <StatCard
        label="Client Initial Capital"
        value={formatRiskCurrency(capital.clientInitialCapital)}
      />
      <StatCard
        label="Client Current Value"
        value={formatRiskCurrency(capital.clientCurrentValue)}
      />
      <StatCard
        label="Client P/L"
        value={formatRiskCurrency(capital.clientPnl)}
        changeType={capital.clientPnl >= 0 ? "positive" : "negative"}
      />
      <StatCard
        label="Client Return %"
        value={formatReturnPercent(capital.clientReturnPct)}
        changeType={capital.clientReturnPct >= 0 ? "positive" : "negative"}
      />
      <StatCard
        label="Allocated Trades"
        value={String(summary.allocatedTradesCount)}
      />
      <StatCard
        label="My Share Earned"
        value={formatRiskCurrency(summary.totalMySharePl)}
        changeType={summary.totalMySharePl >= 0 ? "positive" : "negative"}
      />
      <StatCard
        label="Client Share Paid"
        value={formatRiskCurrency(summary.clientSharePaid)}
      />
      <StatCard
        label="Outstanding Balance"
        value={formatRiskCurrency(summary.outstandingAmountOwed)}
        changeType={
          summary.outstandingAmountOwed > 0 ? "negative" : "positive"
        }
      />
    </div>
  );
}
