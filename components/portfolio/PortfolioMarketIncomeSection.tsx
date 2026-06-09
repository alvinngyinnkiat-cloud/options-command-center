import { MetricCardsGrid } from "@/components/ui/MetricCardsGrid";
import { StatCard } from "@/components/ui/StatCard";
import type { CapitalPoolsBreakdown } from "@/lib/portfolio/capital-pools";
import type { PortfolioIncomeSummary } from "@/lib/ticker-positions/market-types";
import { formatIncomeYieldPct, formatTickerCurrency } from "@/lib/ticker-positions/format";
import { formatSGD } from "@/lib/utils";

interface PortfolioMarketIncomeSectionProps {
  pools: CapitalPoolsBreakdown;
  income: PortfolioIncomeSummary;
}

export function PortfolioMarketIncomeSection({
  pools,
  income,
}: PortfolioMarketIncomeSectionProps) {
  return (
    <section className="space-y-4">
      <h2 className="text-xs font-medium uppercase tracking-wider text-terminal-muted">
        Market &amp; Income Overview
      </h2>

      <MetricCardsGrid>
        <StatCard
          label="US Market Value"
          value={formatSGD(income.usMarketValueSgd)}
          change="US ETF + US Stock (SGD)"
          changeType="neutral"
        />
        <StatCard
          label="SG Market Value"
          value={formatSGD(income.sgMarketValueSgd)}
          change="SG stocks & REITs (SGD)"
          changeType="neutral"
        />
        <StatCard
          label="Coin Holdings Total"
          value={formatSGD(pools.cryptoHoldingsSgd)}
          change="All tokens incl. stablecoins"
          changeType="neutral"
        />
        <StatCard
          label="Available Exchange Cash"
          value={formatSGD(pools.cryptoCashSgd)}
          change="Uninvested exchange fiat"
          changeType="neutral"
        />
        <StatCard
          label="Current Crypto Portfolio Value"
          value={formatSGD(pools.cryptoPortfolioValueSgd)}
          change="Coin holdings + exchange cash"
          changeType="neutral"
        />
        <StatCard
          label="My Portfolio Value"
          value={formatSGD(pools.myPortfolioValue)}
          change="Trading Capital + Crypto Portfolio Value"
          changeType="neutral"
        />
      </MetricCardsGrid>

      <MetricCardsGrid>
        <StatCard
          label="Total Premium Collected"
          value={formatTickerCurrency(income.totalPremiumCollected)}
          change="US options income (USD native)"
          changeType="neutral"
        />
        <StatCard
          label="Total Dividend Income"
          value={formatTickerCurrency(income.totalDividendIncome)}
          change="From Dividend Tracker (YTD net)"
          changeType="neutral"
        />
        <StatCard
          label="US Dividend Income"
          value={formatTickerCurrency(income.usDividendIncome)}
          change="ETF + Stock"
          changeType="neutral"
        />
        <StatCard
          label="SG Dividend Income"
          value={formatSGD(income.sgDividendIncome)}
          change="Stock + REIT"
          changeType="neutral"
        />
        <StatCard
          label="Total Passive Income"
          value={formatTickerCurrency(income.totalPassiveIncome)}
          change="Premium + dividend (annual)"
          changeType="neutral"
        />
        <StatCard
          label="Portfolio Income Yield"
          value={formatIncomeYieldPct(income.portfolioIncomeYieldPct)}
          change="Annual passive ÷ capital deployed"
          changeType="neutral"
        />
      </MetricCardsGrid>
    </section>
  );
}
