import { MetricCardsGrid } from "@/components/ui/MetricCardsGrid";
import { StatCard } from "@/components/ui/StatCard";
import { formatRiskCurrency } from "@/lib/risk/format";
import type { ClientCapitalMetrics } from "@/lib/portfolio/client-capital";
import type { ClientProfitSharingSummary } from "@/lib/client-profit-sharing/types";
import { buildClientCapitalMetrics } from "@/lib/portfolio/client-capital";
import {
  pnlPercentStatProps,
  pnlStatProps,
} from "@/lib/format/pnl";

interface ClientProfitSummaryCardsProps {
  summary: ClientProfitSharingSummary;
}

export function ClientProfitSummaryCards({
  summary,
}: ClientProfitSummaryCardsProps) {
  const capital: ClientCapitalMetrics = buildClientCapitalMetrics(summary);
  const clientPnl = pnlStatProps(capital.clientPnl);
  const clientReturn = pnlPercentStatProps(capital.clientReturnPct, 2);
  const myShare = pnlStatProps(summary.totalMySharePl);
  const outstanding = pnlStatProps(summary.outstandingAmountOwed);

  return (
    <MetricCardsGrid>
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
        value={clientPnl.value}
        valueClassName={clientPnl.valueClassName}
        changeType={clientPnl.changeType}
      />
      <StatCard
        label="Client Return %"
        value={clientReturn.value}
        valueClassName={clientReturn.valueClassName}
        changeType={clientReturn.changeType}
      />
      <StatCard
        label="Allocated Trades"
        value={String(summary.allocatedTradesCount)}
      />
      <StatCard
        label="My Share Earned"
        value={myShare.value}
        valueClassName={myShare.valueClassName}
        changeType={myShare.changeType}
      />
      <StatCard
        label="Client Share Paid"
        value={formatRiskCurrency(summary.clientSharePaid)}
      />
      <StatCard
        label="Outstanding Balance"
        value={outstanding.value}
        valueClassName={outstanding.valueClassName}
        changeType={outstanding.changeType}
      />
    </MetricCardsGrid>
  );
}
