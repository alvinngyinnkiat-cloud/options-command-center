"use client";

import { MetricCardsGrid } from "@/components/ui/MetricCardsGrid";
import { StatCard } from "@/components/ui/StatCard";
import { pnlPercentStatProps, pnlStatProps } from "@/lib/format/pnl";
import type { PersonalPortfolioProfitLoss } from "@/lib/portfolio/personal-profit-loss";
import { formatSGD } from "@/lib/utils";

interface PortfolioProfitLossSectionProps {
  profitLoss: PersonalPortfolioProfitLoss;
}

export function PortfolioProfitLossSection({
  profitLoss,
}: PortfolioProfitLossSectionProps) {
  const pnl = pnlStatProps(profitLoss.myPortfolioPnl, { currency: "SGD" });
  const returnPct = pnlPercentStatProps(profitLoss.myReturnPct, 1);

  return (
    <section className="space-y-4">
      <div>
        <h2 className="text-xs font-medium uppercase tracking-wider text-terminal-muted">
          Portfolio Profit / Loss
        </h2>
        <p className="mt-1 text-[11px] text-terminal-muted">
          My portfolio performance — value minus your personal contributions
          from the Monthly Contribution Tracker (excludes client capital).
        </p>
      </div>
      <MetricCardsGrid>
        <StatCard
          label="My Portfolio P/L"
          value={pnl.value}
          valueClassName={pnl.valueClassName}
          changeType={pnl.changeType}
        />
        <StatCard
          label="My Portfolio Value"
          value={formatSGD(profitLoss.myPortfolioValue)}
          change="Total Portfolio − Client Portfolio"
          changeType="neutral"
        />
        <StatCard
          label="Total Contributions"
          value={formatSGD(profitLoss.totalContributionsSgd)}
          change="All-time from Monthly Contribution Tracker"
          changeType="neutral"
        />
        <StatCard
          label="My Return %"
          value={returnPct.value}
          valueClassName={returnPct.valueClassName}
          changeType={returnPct.changeType}
        />
      </MetricCardsGrid>
    </section>
  );
}
