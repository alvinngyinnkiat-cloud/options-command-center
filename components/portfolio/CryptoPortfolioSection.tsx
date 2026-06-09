import { Badge } from "@/components/ui/Badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/Card";
import { MetricCardsGrid } from "@/components/ui/MetricCardsGrid";
import { StatCard } from "@/components/ui/StatCard";
import type { CapitalPoolsBreakdown } from "@/lib/portfolio/capital-pools";
import { formatSGD } from "@/lib/utils";

interface CryptoPortfolioSectionProps {
  pools: CapitalPoolsBreakdown;
}

export function CryptoPortfolioSection({ pools }: CryptoPortfolioSectionProps) {
  return (
    <section className="space-y-4">
      <h2 className="text-xs font-medium uppercase tracking-wider text-terminal-muted">
        Crypto Portfolio
      </h2>

      <p className="text-[11px] text-terminal-muted">
        Current Crypto Portfolio Value = Coin Holdings Total + Available Exchange
        Cash. Stablecoins (USDT, USDC, etc.) are coin holdings, not cash.
      </p>

      <MetricCardsGrid gap="lg">
        <Card variant="bordered" className="metric-stat-card">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between gap-2">
              <CardTitle className="text-sm">Coin Holdings Total</CardTitle>
              <Badge variant="outline">All Tokens</Badge>
            </div>
            <CardDescription>
              Includes BTC, ETH, USDT, USDC, and all other crypto assets.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="metric-stat-value font-mono font-semibold text-terminal-text">
              {formatSGD(pools.cryptoHoldingsSgd)}
            </p>
          </CardContent>
        </Card>

        <Card variant="bordered" className="metric-stat-card">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between gap-2">
              <CardTitle className="text-sm">Available Exchange Cash</CardTitle>
              <Badge variant="outline">Fiat Only</Badge>
            </div>
            <CardDescription>
              Uninvested exchange fiat — not stablecoin holdings.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="metric-stat-value font-mono font-semibold text-terminal-text">
              {formatSGD(pools.cryptoCashSgd)}
            </p>
          </CardContent>
        </Card>

        <Card variant="bordered" className="metric-stat-card">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between gap-2">
              <CardTitle className="text-sm">Current Crypto Portfolio Value</CardTitle>
              <Badge variant="info">Portfolio Value</Badge>
            </div>
            <CardDescription>
              Coin Holdings Total + Available Exchange Cash.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="metric-stat-value font-mono font-semibold text-terminal-text">
              {formatSGD(pools.cryptoPortfolioValueSgd)}
            </p>
            <p className="mt-2 text-[10px] text-terminal-muted">
              {formatSGD(pools.cryptoHoldingsSgd)} +{" "}
              {formatSGD(pools.cryptoCashSgd)}
            </p>
          </CardContent>
        </Card>
      </MetricCardsGrid>

      <MetricCardsGrid>
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
          change="Included in Portfolio Value"
          changeType="neutral"
        />
      </MetricCardsGrid>
    </section>
  );
}
