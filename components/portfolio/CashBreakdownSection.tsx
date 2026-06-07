import { Badge } from "@/components/ui/Badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/Card";
import { StatCard } from "@/components/ui/StatCard";
import type { CapitalPoolsBreakdown } from "@/lib/portfolio/capital-pools";
import { formatSGD } from "@/lib/utils";

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

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card variant="bordered">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between gap-2">
              <CardTitle className="text-sm">Trading Cash</CardTitle>
              <Badge variant="info">Trading Use</Badge>
            </div>
            <CardDescription>
              Broker cash for stocks, ETFs and options.
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
            <p className="text-[10px] text-terminal-muted">
              USD {cash.brokerUsdCashNative.toLocaleString()} (SGD eq.{" "}
              {formatSGD(cash.brokerUsdCashSgdEquivalent)}) · SGD{" "}
              {cash.brokerSgdCash.toLocaleString()}
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
              Cash/stablecoins held for crypto investing.
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
              Not used for stock or options trading decisions.
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
    <section className="space-y-4">
      <h2 className="text-xs font-medium uppercase tracking-wider text-terminal-muted">
        Portfolio Summary
      </h2>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-4">
        <StatCard
          label="My Portfolio Value"
          value={formatSGD(pools.myPortfolioValue)}
          change="Trading + Crypto capital"
          changeType="neutral"
        />
        <StatCard
          label="Trading Capital"
          value={formatSGD(pools.tradingCapital)}
          change="Stocks, ETFs, options, trading cash"
          changeType="neutral"
        />
        <StatCard
          label="Crypto Capital"
          value={formatSGD(pools.cryptoCapital)}
          change="Crypto holdings + crypto cash"
          changeType="neutral"
        />
        <StatCard
          label="Trading Cash"
          value={formatSGD(pools.tradingCashSgd)}
          change="Broker USD + SGD"
          changeType="neutral"
        />
        <StatCard
          label="Crypto Cash"
          value={formatSGD(pools.cryptoCashSgd)}
          change="Exchange stablecoins"
          changeType="neutral"
        />
        <StatCard
          label="Total Cash"
          value={formatSGD(pools.cash.totalCashSgd)}
          change="Net worth tracking"
          changeType="neutral"
        />
      </div>
    </section>
  );
}
