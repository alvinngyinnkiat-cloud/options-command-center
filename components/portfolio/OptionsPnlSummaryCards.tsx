import { StatCard } from "@/components/ui/StatCard";
import { formatSignedCurrency } from "@/lib/trades/format";
import type { OpenPositionSummary } from "@/lib/portfolio/types";

interface OptionsPnlSummaryCardsProps {
  positions: OpenPositionSummary[];
}

export function OptionsPnlSummaryCards({
  positions,
}: OptionsPnlSummaryCardsProps) {
  const myOpenPnl = positions.reduce((s, p) => s + p.pnl, 0);
  const clientPnlOwed = positions.reduce((s, p) => s + p.clientPnl, 0);

  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
      <StatCard
        label="My Open Options P/L"
        value={formatSignedCurrency(myOpenPnl)}
        change="Personal share only"
        changeType={myOpenPnl >= 0 ? "positive" : "negative"}
      />
      <StatCard
        label="Client P/L Owed"
        value={formatSignedCurrency(clientPnlOwed)}
        change="Open client profit share"
        changeType={clientPnlOwed >= 0 ? "positive" : "negative"}
      />
    </div>
  );
}
