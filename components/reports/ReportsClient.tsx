"use client";

import { useCallback, useState } from "react";
import { Badge } from "@/components/ui/Badge";
import { PageHeader } from "@/components/ui/PageHeader";
import {
  formatIncomeYieldPct,
  formatSignedTickerCurrency,
  formatTickerCurrency,
} from "@/lib/ticker-positions/format";
import type { TickerPositionManagerData } from "@/lib/supabase/queries/ticker-positions";
import type { DividendTrackerData } from "@/lib/dividends/types";
import type { ClientProfitSharingData } from "@/lib/client-profit-sharing/types";
import type { CapitalPoolsBreakdown } from "@/lib/portfolio/capital-pools";
import { buildClientCapitalMetrics } from "@/lib/portfolio/client-capital";
import { useDividendDataSync, type DividendDependentRefreshData } from "@/lib/dividends/use-dividend-sync";
import { formatReturnPercent, formatSGD, formatSignedSGD } from "@/lib/utils";

interface ReportsClientProps {
  tickerData: TickerPositionManagerData;
  dividendData: DividendTrackerData;
  clientData: ClientProfitSharingData;
  capitalPools: CapitalPoolsBreakdown;
  dataSource: "supabase" | "mock";
  /** Latest recorded AUM from daily_portfolio_snapshots (DB-generated column). */
  recordedTotalAssetsManagedSgd?: number | null;
}

function TableSection({
  title,
  headers,
  rows,
}: {
  title: string;
  headers: string[];
  rows: string[][];
}) {
  if (rows.length === 0) {
    return (
      <div className="rounded-lg border border-terminal-border bg-terminal-surface p-4">
        <h3 className="text-xs font-medium uppercase tracking-wider text-terminal-muted mb-2">
          {title}
        </h3>
        <p className="text-sm text-terminal-muted">No data yet.</p>
      </div>
    );
  }
  return (
    <div className="rounded-lg border border-terminal-border bg-terminal-surface p-4 overflow-x-auto">
      <h3 className="text-xs font-medium uppercase tracking-wider text-terminal-muted mb-3">
        {title}
      </h3>
      <table className="w-full text-xs">
        <thead>
          <tr className="border-b border-terminal-border text-terminal-muted">
            {headers.map((h) => (
              <th key={h} className="py-2 text-left font-medium">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={i} className="border-b border-terminal-border/50">
              {row.map((cell, j) => (
                <td key={j} className="py-2 font-mono">
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function ReportsClient({
  tickerData: initialTickerData,
  dividendData: initialDividendData,
  clientData: initialClientData,
  capitalPools: initialCapitalPools,
  dataSource,
  recordedTotalAssetsManagedSgd,
}: ReportsClientProps) {
  const [tickerData, setTickerData] = useState(initialTickerData);
  const [dividendData, setDividendData] = useState(initialDividendData);
  const [clientData] = useState(initialClientData);
  const [capitalPools] = useState(initialCapitalPools);
  const totalAssetsManaged =
    recordedTotalAssetsManagedSgd ?? capitalPools.totalAssetsManaged;

  const handleDividendSync = useCallback((refresh: DividendDependentRefreshData) => {
    setTickerData(refresh.tickerData);
    setDividendData(refresh.dividendData);
  }, []);
  useDividendDataSync(handleDividendSync);

  const { report, portfolioIncome, usMarket, sgMarket } = tickerData;
  const clientCapital = buildClientCapitalMetrics(clientData.summary);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Reports"
        description="My portfolio performance by default — client capital reported separately"
        actions={
          <Badge variant={dataSource === "supabase" ? "success" : "outline"}>
            {dataSource === "supabase" ? "Live data" : "Mock data"}
          </Badge>
        }
      />

      <TableSection
        title="Client Performance Summary"
        headers={["Metric", "Value"]}
        rows={[
          [
            "Client Initial Capital",
            formatSGD(clientCapital.clientInitialCapital),
          ],
          [
            "Client Current Value",
            formatSGD(clientCapital.clientCurrentValue),
          ],
          ["Client P/L", formatSignedSGD(clientCapital.clientPnl)],
          ["Client Return %", formatReturnPercent(clientCapital.clientReturnPct)],
          [
            "My Share Earned (Client Trades)",
            formatSGD(clientData.summary.totalMySharePl),
          ],
          [
            "Outstanding Balance",
            formatSGD(clientData.summary.outstandingAmountOwed),
          ],
        ]}
      />

      <TableSection
        title="Assets Under Management Summary"
        headers={["Metric", "Value"]}
        rows={[
          ["My Portfolio Value", formatSGD(capitalPools.myPortfolioValue)],
          [
            "Client Current Value",
            formatSGD(capitalPools.clientCurrentValue),
          ],
          [
            "Total Assets Managed",
            formatSGD(totalAssetsManaged),
          ],
        ]}
      />

      <TableSection
        title="Portfolio Market Overview (My Portfolio Only)"
        headers={["Metric", "Value"]}
        rows={[
          ["US Market Value", formatSGD(portfolioIncome.usMarketValueSgd)],
          ["SG Market Value", formatSGD(portfolioIncome.sgMarketValueSgd)],
          [
            "Total Premium Collected",
            formatTickerCurrency(portfolioIncome.totalPremiumCollected),
          ],
          [
            "Total Dividend Income",
            formatTickerCurrency(portfolioIncome.totalDividendIncome),
          ],
          [
            "US Dividend Income",
            formatTickerCurrency(portfolioIncome.usDividendIncome),
          ],
          [
            "SG Dividend Income",
            formatSGD(portfolioIncome.sgDividendIncome),
          ],
          [
            "Total Passive Income",
            formatTickerCurrency(portfolioIncome.totalPassiveIncome),
          ],
          [
            "Portfolio Income Yield",
            formatIncomeYieldPct(portfolioIncome.portfolioIncomeYieldPct),
          ],
        ]}
      />

      <section className="space-y-3">
        <h2 className="text-xs font-medium uppercase tracking-wider text-terminal-muted">
          US Market Reports
        </h2>
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <TableSection
            title="Best Performing US Tickers"
            headers={["Ticker", "Total P/L", "Income Yield %"]}
            rows={report.usTopPerformers.map((r) => [
              r.ticker,
              formatSignedTickerCurrency(r.totalPnl),
              formatIncomeYieldPct(r.incomeYieldPct),
            ])}
          />
          <TableSection
            title="Worst Performing US Tickers"
            headers={["Ticker", "Total P/L", "Income Yield %"]}
            rows={report.usWorstPerformers.map((r) => [
              r.ticker,
              formatSignedTickerCurrency(r.totalPnl),
              formatIncomeYieldPct(r.incomeYieldPct),
            ])}
          />
          <TableSection
            title="Premium Collected By Ticker"
            headers={["Ticker", "Premium Collected"]}
            rows={report.usPremiumByTicker.map((r) => [
              r.ticker,
              formatTickerCurrency(r.premiumCollected),
            ])}
          />
          <TableSection
            title="Dividend Income By Ticker (US)"
            headers={["Ticker", "Dividend Income", "Annual Dividend"]}
            rows={report.usDividendByTicker.map((r) => [
              r.ticker,
              formatTickerCurrency(r.dividendIncome),
              formatTickerCurrency(r.annualDividendIncome),
            ])}
          />
          <TableSection
            title="Highest Income Yield (US)"
            headers={["Ticker", "Income Yield %", "Category"]}
            rows={report.usHighestIncomeYield.map((r) => [
              r.ticker,
              formatIncomeYieldPct(r.incomeYieldPct),
              r.category,
            ])}
          />
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="text-xs font-medium uppercase tracking-wider text-terminal-muted">
          SG Market Reports
        </h2>
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <TableSection
            title="Best Performing SG Tickers"
            headers={["Ticker", "Total P/L", "Income Yield %"]}
            rows={report.sgTopPerformers.map((r) => [
              r.ticker,
              formatSignedTickerCurrency(r.totalPnl),
              formatIncomeYieldPct(r.incomeYieldPct),
            ])}
          />
          <TableSection
            title="Worst Performing SG Tickers"
            headers={["Ticker", "Total P/L", "Income Yield %"]}
            rows={report.sgWorstPerformers.map((r) => [
              r.ticker,
              formatSignedTickerCurrency(r.totalPnl),
              formatIncomeYieldPct(r.incomeYieldPct),
            ])}
          />
          <TableSection
            title="Dividend Income By Ticker (SG)"
            headers={["Ticker", "Dividend Income", "Annual Dividend"]}
            rows={report.sgDividendByTicker.map((r) => [
              r.ticker,
              formatTickerCurrency(r.dividendIncome),
              formatTickerCurrency(r.annualDividendIncome),
            ])}
          />
          <TableSection
            title="Highest Income Yield (SG)"
            headers={["Ticker", "Income Yield %", "Category"]}
            rows={report.sgHighestIncomeYield.map((r) => [
              r.ticker,
              formatIncomeYieldPct(r.incomeYieldPct),
              r.category,
            ])}
          />
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="text-xs font-medium uppercase tracking-wider text-terminal-muted">
          Dividend Reports
        </h2>
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <TableSection
            title="Dividend Income By Market"
            headers={["Market", "YTD Net", "Records"]}
            rows={dividendData.byMarket.map((m) => [
              m.market,
              formatSGD(m.totalNetYtd),
              String(m.count),
            ])}
          />
          <TableSection
            title="Dividend Yield Ranking"
            headers={["Ticker", "Category", "Yield %", "Annual"]}
            rows={dividendData.yieldRanking.slice(0, 10).map((r) => [
              r.ticker,
              r.categoryLabel,
              `${r.dividendYieldPct.toFixed(2)}%`,
              formatSGD(r.annualIncome),
            ])}
          />
          <TableSection
            title="Upcoming Dividends"
            headers={["Ticker", "Ex-Date", "Pay Date", "Net", "Source"]}
            rows={dividendData.summary.upcoming.map((r) => [
              r.ticker,
              r.exDividendDate ?? "—",
              r.paymentDate ?? "—",
              `${r.currency} ${r.netDividend.toFixed(2)}`,
              r.source,
            ])}
          />
          <TableSection
            title="Received Dividends"
            headers={["Ticker", "Pay Date", "Net", "SGD", "Source"]}
            rows={dividendData.summary.received.slice(0, 15).map((r) => [
              r.ticker,
              r.paymentDate ?? "—",
              `${r.currency} ${r.netDividend.toFixed(2)}`,
              formatSGD(r.sgdEquivalent),
              r.source,
            ])}
          />
          <TableSection
            title="Dividend Calendar"
            headers={["Ticker", "Ex-Date", "Status", "DPS"]}
            rows={dividendData.summary.calendar.slice(0, 20).map((r) => [
              r.ticker,
              r.exDividendDate ?? r.paymentDate ?? "—",
              r.status,
              String(r.dividendPerShare),
            ])}
          />
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="text-xs font-medium uppercase tracking-wider text-terminal-muted">
          Leaderboards
        </h2>
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <TableSection
            title="Top Premium Generators"
            headers={["Ticker", "Premium Collected", "Premium Yield %"]}
            rows={report.topPremiumGenerators.map((r) => [
              r.ticker,
              formatTickerCurrency(r.premiumCollected),
              formatIncomeYieldPct(r.premiumYieldPct),
            ])}
          />
          <TableSection
            title="Top Dividend Generators"
            headers={["Ticker", "Annual Dividend", "Dividend Yield %"]}
            rows={report.topDividendGenerators.map((r) => [
              r.ticker,
              formatTickerCurrency(r.annualDividendIncome),
              r.dividendYield != null
                ? formatIncomeYieldPct(r.dividendYield)
                : "—",
            ])}
          />
          <TableSection
            title="Top Passive Income Generators"
            headers={[
              "Ticker",
              "Premium",
              "Dividend",
              "Total Passive",
              "Income Yield %",
            ]}
            rows={report.topPassiveIncomeGenerators.map((r) => [
              r.ticker,
              formatTickerCurrency(r.premiumIncome),
              formatTickerCurrency(r.dividendIncome),
              formatTickerCurrency(r.totalPassiveIncome),
              formatIncomeYieldPct(r.incomeYieldPct),
            ])}
          />
          <TableSection
            title="Market Summary"
            headers={["Market", "Total Value", "Total P/L", "Avg Yield %"]}
            rows={[
              [
                "US",
                formatTickerCurrency(usMarket.summary.totalMarketValue),
                formatSignedTickerCurrency(usMarket.summary.totalPnl),
                formatIncomeYieldPct(usMarket.summary.averageIncomeYieldPct),
              ],
              [
                "SG",
                formatTickerCurrency(sgMarket.summary.totalMarketValue),
                formatSignedTickerCurrency(sgMarket.summary.totalPnl),
                formatIncomeYieldPct(sgMarket.summary.averageIncomeYieldPct),
              ],
            ]}
          />
        </div>
      </section>
    </div>
  );
}
