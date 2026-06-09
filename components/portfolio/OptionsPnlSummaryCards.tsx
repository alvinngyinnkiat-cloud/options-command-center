import { MetricCardsGrid } from "@/components/ui/MetricCardsGrid";
import { StatCard } from "@/components/ui/StatCard";
import { pnlStatProps } from "@/lib/format/pnl";
import type { OpenPositionSummary } from "@/lib/portfolio/types";

interface OptionsPnlSummaryCardsProps {
  positions: OpenPositionSummary[];
}

export function OptionsPnlSummaryCards({
  positions,
}: OptionsPnlSummaryCardsProps) {
  const myOpenPnl = positions.reduce((s, p) => s + p.pnl, 0);
  const clientPnlOwed = positions.reduce((s, p) => s + p.clientPnl, 0);
  const myOpen = pnlStatProps(myOpenPnl);
  const clientOwed = pnlStatProps(clientPnlOwed);

  return (
    <MetricCardsGrid>
      <StatCard
        label="My Open Options P/L"
        value={myOpen.value}
        change="Personal share only"
        valueClassName={myOpen.valueClassName}
        changeType={myOpen.changeType}
      />
      <StatCard
        label="Client P/L Owed"
        value={clientOwed.value}
        change="Open client profit share"
        valueClassName={clientOwed.valueClassName}
        changeType={clientOwed.changeType}
      />
    </MetricCardsGrid>
  );
}
