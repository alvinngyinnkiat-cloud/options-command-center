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
import { formatSGD, formatUsd } from "@/lib/utils";

interface CashBreakdownSectionProps {
  pools: CapitalPoolsBreakdown;
}

function UsageRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between text-xs">
      <span className="text-terminal-muted">{label}</span>
      <span className="font-mono text-terminal-text">{value}</span>
    </div>
  );
}

export function CashBreakdownSection({ pools }: CashBreakdownSectionProps) {
  const { cash } = pools;

  return (
    <section className="space-y-4">
      <h2 className="text-xs font-medium uppercase tracking-wider text-terminal-muted">
        Cash Breakdown
      </h2>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-4">
        <Card variant="bordered">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between gap-2">
              <CardTitle className="text-sm">Trading Cash SGD</CardTitle>
              <Badge variant="info">Trading Use</Badge>
            </div>
            <CardDescription>
              Broker SGD cash for stocks, ETFs and options — in Portfolio Value
              and Trading Capital.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="font-mono text-2xl font-semibold text-terminal-text">
              {formatSGD(cash.tradingCashSgd)}
            </p>
            <div className="space-y-1.5 border-t border-terminal-border pt-3">
              <p className="text-[10px] uppercase tracking-wider text-terminal-muted">
                Trading Cash Usage
              </p>
              <UsageRow
                label="Available for Stocks"
                value={formatSGD(cash.availableForStocksSgd)}
              />
              <UsageRow
                label="Available for ETFs"
                value={formatSGD(cash.availableForEtfsSgd)}
              />
              <UsageRow
                label="Available for Options"
                value={formatSGD(cash.availableForOptionsSgd)}
              />
            </div>
          </CardContent>
        </Card>

        <Card variant="bordered">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between gap-2">
              <CardTitle className="text-sm">Trading Cash USD</CardTitle>
              <Badge variant="outline">Reference Only</Badge>
            </div>
            <CardDescription>
              Broker USD cash — not converted to SGD and not in any total.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="font-mono text-2xl font-semibold text-terminal-text">
              {formatUsd(cash.brokerUsdCashNative)}
            </p>
            <p className="text-[10px] text-terminal-muted">
              US stocks/options buying-power reference only.
            </p>
          </CardContent>
        </Card>

        <Card variant="bordered">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between gap-2">
              <CardTitle className="text-sm">Crypto Cash</CardTitle>
              <Badge variant="outline">Crypto Only</Badge>
            </div>
            <CardDescription>
              Stablecoins / exchange cash — breakdown only; included in Crypto
              Value, not added separately to Portfolio Value.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="font-mono text-2xl font-semibold text-terminal-text">
              {formatSGD(cash.cryptoCashSgd)}
            </p>
            <div className="space-y-1.5 border-t border-terminal-border pt-3">
              <p className="text-[10px] uppercase tracking-wider text-terminal-muted">
                Crypto Cash Usage
              </p>
              <UsageRow
                label="Available for Crypto Only"
                value={formatSGD(cash.availableForCryptoSgd)}
              />
            </div>
            <p className="text-[10px] text-terminal-muted">
              Excluded from Trading Capital and Trading Cash SGD — edit via Manual
              Crypto Cash card.
            </p>
          </CardContent>
        </Card>

        <Card variant="bordered">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between gap-2">
              <CardTitle className="text-sm">Total Cash</CardTitle>
              <Badge variant="default">Net Worth Only</Badge>
            </div>
            <CardDescription>Trading Cash + Crypto Cash.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="font-mono text-2xl font-semibold text-terminal-text">
              {formatSGD(cash.totalCashSgd)}
            </p>
            <div className="space-y-1 text-xs text-terminal-muted">
              <p>
                Trading {formatSGD(cash.tradingCashSgd)} + Crypto{" "}
                {formatSGD(cash.cryptoCashSgd)}
              </p>
            </div>
            <p className="text-[10px] text-terminal-muted">
              For net worth tracking only — trading decisions use Trading Cash.
            </p>
          </CardContent>
        </Card>
      </div>
    </section>
  );
}

interface PortfolioSummarySectionProps {
  pools: CapitalPoolsBreakdown;
}

export function PortfolioSummarySection({ pools }: PortfolioSummarySectionProps) {
  return (
    <MetricCardsGrid>
      <StatCard
        label="Trading Capital"
        value={formatSGD(pools.tradingCapital)}
        change="US/SG + Trading Cash SGD + options — excludes crypto"
        changeType="neutral"
      />
    </MetricCardsGrid>
  );
}
