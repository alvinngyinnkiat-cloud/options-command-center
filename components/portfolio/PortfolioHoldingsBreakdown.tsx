import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/Card";
import { buildPortfolioHoldingsPresentation } from "@/lib/portfolio/holdings-presentation";
import {
  formatAllocationPct,
  formatNativeValue,
} from "@/lib/portfolio/format-holdings";
import type { PortfolioMetrics } from "@/lib/portfolio/types";
import { cn, formatSGD, formatSignedSGD } from "@/lib/utils";
import { Bitcoin, Banknote, LineChart, Wallet } from "lucide-react";

interface PortfolioHoldingsBreakdownProps {
  metrics: PortfolioMetrics;
}

function SectionHeader({
  icon: Icon,
  title,
  total,
  allocationPct,
  description,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  total: number;
  allocationPct: number;
  description?: string;
}) {
  return (
    <div className="flex items-start justify-between gap-3 border-b border-terminal-border pb-3 mb-3">
      <div className="flex items-start gap-3">
        <div className="flex h-9 w-9 items-center justify-center rounded-md bg-accent/15 border border-accent/20">
          <Icon className="h-4 w-4 text-accent" />
        </div>
        <div>
          <h3 className="text-sm font-semibold text-terminal-text">{title}</h3>
          {description && (
            <p className="text-[11px] text-terminal-muted mt-0.5">{description}</p>
          )}
        </div>
      </div>
      <div className="text-right">
        <p className="font-mono text-sm font-semibold text-terminal-text">
          {formatSGD(total)}
        </p>
        <p className="text-[10px] text-terminal-muted">
          {formatAllocationPct(allocationPct)} of portfolio
        </p>
      </div>
    </div>
  );
}

function CurrencyGroupTable({
  label,
  currency,
  rows,
  nativeSubtotal,
  sgdSubtotal,
}: {
  label: string;
  currency: "SGD" | "USD";
  rows: ReturnType<
    typeof buildPortfolioHoldingsPresentation
  >["stocksAndOptions"]["sgdGroup"]["rows"];
  nativeSubtotal: number;
  sgdSubtotal: number;
}) {
  if (rows.length === 0) return null;

  return (
    <div className="mb-4 last:mb-0">
      <p className="text-[10px] uppercase tracking-wider text-terminal-muted mb-2">
        {label}
      </p>
      <div className="overflow-x-auto rounded-md border border-terminal-border">
        <table className="w-full min-w-[520px] text-xs">
          <thead>
            <tr className="border-b border-terminal-border bg-terminal-elevated/60 text-left uppercase tracking-wider text-terminal-muted">
              <th className="px-3 py-2 font-medium">Ticker</th>
              <th className="px-3 py-2 font-medium">Type</th>
              <th className="px-3 py-2 font-medium text-right">Native</th>
              <th className="px-3 py-2 font-medium text-right">SGD</th>
              <th className="px-3 py-2 font-medium text-right">Alloc %</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row, i) => (
              <tr
                key={`${row.holding.ticker}-${row.holding.asset_type}-${i}`}
                className="border-b border-terminal-border/40 hover:bg-terminal-elevated/30"
              >
                <td className="px-3 py-2 font-mono font-semibold text-terminal-text">
                  {row.holding.ticker}
                </td>
                <td className="px-3 py-2 text-terminal-muted capitalize">
                  {row.holding.asset_type}
                </td>
                <td className="px-3 py-2 font-mono text-right text-terminal-muted">
                  {formatNativeValue(
                    row.holding.market_value_native,
                    row.holding.currency
                  )}
                </td>
                <td className="px-3 py-2 font-mono text-right text-terminal-text">
                  {formatSGD(row.holding.market_value_sgd)}
                </td>
                <td className="px-3 py-2 font-mono text-right text-accent">
                  {formatAllocationPct(row.allocationPct)}
                </td>
              </tr>
            ))}
            <tr className="bg-terminal-elevated/40 font-medium">
              <td colSpan={2} className="px-3 py-2 text-terminal-muted">
                {currency} subtotal
              </td>
              <td className="px-3 py-2 font-mono text-right text-terminal-muted">
                {formatNativeValue(nativeSubtotal, currency)}
              </td>
              <td className="px-3 py-2 font-mono text-right text-terminal-text">
                {formatSGD(sgdSubtotal)}
              </td>
              <td />
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}

export function PortfolioHoldingsBreakdown({
  metrics,
}: PortfolioHoldingsBreakdownProps) {
  const data = buildPortfolioHoldingsPresentation(
    metrics.holdings,
    metrics.portfolioValue
  );

  return (
    <div className="space-y-4">
      <Card variant="bordered">
        <CardHeader>
          <CardTitle>Portfolio Summary</CardTitle>
          <CardDescription>
            SGD reporting currency · native values shown in section tables
            {metrics.comparison.useManualOverride && " · reconciliation active"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {[
              {
                label: "Stocks & Options",
                value: data.summary.stocksAndOptionsTotal,
              },
              { label: "Crypto", value: data.summary.cryptoTotal },
              { label: "Cash", value: data.summary.cashTotal },
              {
                label: "Overall Portfolio",
                value: data.summary.overallPortfolioValue,
                highlight: true,
              },
            ].map((item) => (
              <div
                key={item.label}
                className={cn(
                  "rounded-md border px-3 py-3",
                  item.highlight
                    ? "border-accent/40 bg-accent/10"
                    : "border-terminal-border bg-terminal-elevated/50"
                )}
              >
                <p className="text-[10px] uppercase tracking-wider text-terminal-muted">
                  {item.label}
                </p>
                <p className="mt-1 font-mono text-lg font-semibold text-terminal-text">
                  {formatSGD(item.value)}
                </p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        <Card variant="default">
          <CardContent className="pt-5">
            <SectionHeader
              icon={LineChart}
              title="Stocks & Options"
              total={data.stocksAndOptions.totalSgd}
              allocationPct={data.stocksAndOptions.allocationPct}
              description="Stocks, ETFs, and open options · grouped by currency"
            />
            <CurrencyGroupTable
              label="Singapore (SGD)"
              currency="SGD"
              rows={data.stocksAndOptions.sgdGroup.rows}
              nativeSubtotal={data.stocksAndOptions.sgdGroup.nativeSubtotal}
              sgdSubtotal={data.stocksAndOptions.sgdGroup.sgdSubtotal}
            />
            <CurrencyGroupTable
              label="United States (USD)"
              currency="USD"
              rows={data.stocksAndOptions.usdGroup.rows}
              nativeSubtotal={data.stocksAndOptions.usdGroup.nativeSubtotal}
              sgdSubtotal={data.stocksAndOptions.usdGroup.sgdSubtotal}
            />
          </CardContent>
        </Card>

        <div className="space-y-4">
          <Card variant="default">
            <CardContent className="pt-5">
              <SectionHeader
                icon={Bitcoin}
                title="Crypto"
                total={data.crypto.totalSgd}
                allocationPct={data.crypto.allocationPct}
              />
              <div className="overflow-x-auto rounded-md border border-terminal-border">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-terminal-border bg-terminal-elevated/60 text-left uppercase tracking-wider text-terminal-muted">
                      <th className="px-3 py-2 font-medium">Asset</th>
                      <th className="px-3 py-2 font-medium text-right">Value (SGD)</th>
                      <th className="px-3 py-2 font-medium text-right">Native</th>
                      <th className="px-3 py-2 font-medium text-right">Cost</th>
                      <th className="px-3 py-2 font-medium text-right">G/L</th>
                      <th className="px-3 py-2 font-medium text-right">Alloc %</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.crypto.rows.map((row) => (
                      <tr
                        key={row.label}
                        className="border-b border-terminal-border/40 hover:bg-terminal-elevated/30"
                      >
                        <td className="px-3 py-2 font-mono font-semibold text-terminal-text">
                          {row.label}
                        </td>
                        <td className="px-3 py-2 font-mono text-right text-terminal-text">
                          {formatSGD(row.currentValueSgd)}
                        </td>
                        <td className="px-3 py-2 font-mono text-right text-terminal-muted">
                          {row.label === "Other"
                            ? "—"
                            : formatNativeValue(
                                row.holding.market_value_native,
                                row.holding.currency
                              )}
                        </td>
                        <td className="px-3 py-2 font-mono text-right text-terminal-muted">
                          {row.costBasisSgd != null
                            ? formatSGD(row.costBasisSgd)
                            : "—"}
                        </td>
                        <td
                          className={cn(
                            "px-3 py-2 font-mono text-right",
                            row.gainLossSgd != null
                              ? row.gainLossSgd >= 0
                                ? "text-profit"
                                : "text-loss"
                              : "text-terminal-muted"
                          )}
                        >
                          {row.gainLossSgd != null
                            ? formatSignedSGD(row.gainLossSgd)
                            : "—"}
                        </td>
                        <td className="px-3 py-2 font-mono text-right text-accent">
                          {formatAllocationPct(row.allocationPct)}
                        </td>
                      </tr>
                    ))}
                    {data.crypto.rows.length === 0 && (
                      <tr>
                        <td
                          colSpan={6}
                          className="px-3 py-6 text-center text-terminal-muted"
                        >
                          No crypto holdings
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>

          <Card variant="default">
            <CardContent className="pt-5">
              <SectionHeader
                icon={Banknote}
                title="Cash"
                total={data.cash.totalSgd}
                allocationPct={data.cash.allocationPct}
                description="SGD and USD cash balances"
              />
              <div className="overflow-x-auto rounded-md border border-terminal-border">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-terminal-border bg-terminal-elevated/60 text-left uppercase tracking-wider text-terminal-muted">
                      <th className="px-3 py-2 font-medium">Account</th>
                      <th className="px-3 py-2 font-medium text-right">Native</th>
                      <th className="px-3 py-2 font-medium text-right">FX</th>
                      <th className="px-3 py-2 font-medium text-right">SGD</th>
                      <th className="px-3 py-2 font-medium text-right">Alloc %</th>
                    </tr>
                  </thead>
                  <tbody>
                    {[data.cash.sgdCash, data.cash.usdCash]
                      .filter(Boolean)
                      .map((row) => (
                        <tr
                          key={row!.label}
                          className="border-b border-terminal-border/40 hover:bg-terminal-elevated/30"
                        >
                          <td className="px-3 py-2 font-medium text-terminal-text">
                            {row!.label}
                          </td>
                          <td className="px-3 py-2 font-mono text-right text-terminal-muted">
                            {formatNativeValue(row!.nativeValue, row!.currency)}
                          </td>
                          <td className="px-3 py-2 font-mono text-right text-terminal-muted">
                            {row!.currency === "SGD"
                              ? "1.000"
                              : row!.holding.fx_rate_to_sgd.toFixed(3)}
                          </td>
                          <td className="px-3 py-2 font-mono text-right text-terminal-text">
                            {formatSGD(row!.sgdValue)}
                          </td>
                          <td className="px-3 py-2 font-mono text-right text-accent">
                            {formatAllocationPct(row!.allocationPct)}
                          </td>
                        </tr>
                      ))}
                    {!data.cash.sgdCash && !data.cash.usdCash && (
                      <tr>
                        <td
                          colSpan={5}
                          className="px-3 py-6 text-center text-terminal-muted"
                        >
                          No cash balances
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      <p className="text-[11px] text-terminal-muted flex items-center gap-1.5">
        <Wallet className="h-3.5 w-3.5" />
        Allocation % based on active portfolio value (
        {formatSGD(metrics.portfolioValue)}). Calculated totals unchanged — display
        grouping only.
      </p>
    </div>
  );
}
