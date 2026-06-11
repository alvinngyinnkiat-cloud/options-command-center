import { StatCard } from "@/components/ui/StatCard";
import { pnlPercentStatProps, pnlStatProps } from "@/lib/format/pnl";
import { formatSGD } from "@/lib/utils";
import type { CryptoPortfolioManualState } from "@/lib/crypto/types";

interface CryptoSummaryCardsProps {
  portfolioManual: CryptoPortfolioManualState;
}

export function CryptoSummaryCards({ portfolioManual }: CryptoSummaryCardsProps) {
  const pnl = pnlStatProps(portfolioManual.profitLossSgd, { currency: "SGD" });
  const returnPct = pnlPercentStatProps(portfolioManual.returnPct, 1);

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-7">
      <StatCard
        label="Coin Holdings Total"
        value={formatSGD(portfolioManual.cryptoHoldingsValueSgd)}
      />
      <StatCard
        label="Available Exchange Cash"
        value={formatSGD(portfolioManual.cryptoCashSgd)}
      />
      <StatCard
        label="Current Crypto Portfolio Value"
        value={formatSGD(portfolioManual.totalCryptoPortfolioValueSgd)}
      />
      <StatCard
        label="Total Contributions / Cost SGD"
        value={formatSGD(portfolioManual.totalContributionsSgd)}
      />
      <StatCard
        label="Crypto P/L SGD"
        value={pnl.value}
        valueClassName={pnl.valueClassName}
        changeType={pnl.changeType}
      />
      <StatCard
        label="Total Return %"
        value={returnPct.value}
        valueClassName={returnPct.valueClassName}
        changeType={returnPct.changeType}
      />
      <StatCard
        label="Total Fees Paid"
        value={formatSGD(portfolioManual.totalFeesPaidSgd)}
      />
    </div>
  );
}
