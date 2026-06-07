"use client";

import { useCallback, useState } from "react";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { PageHeader } from "@/components/ui/PageHeader";
import {
  formatIncomeYieldPct,
  formatSignedTickerCurrency,
  formatTickerCurrency,
} from "@/lib/ticker-positions/format";
import type { TickerPositionManagerData } from "@/lib/supabase/queries/ticker-positions";
import { useDividendDataSync, type DividendDependentRefreshData } from "@/lib/dividends/use-dividend-sync";
import {
  SgMarketSummaryCards,
  SgMarketTable,
  UsMarketSummaryCards,
  UsMarketTable,
} from "./MarketTables";

type MarketTab = "us" | "sg";

function LeaderboardTable({
  title,
  headers,
  rows,
}: {
  title: string;
  headers: string[];
  rows: string[][];
}) {
  if (rows.length === 0) return null;
  return (
    <div className="rounded-lg border border-terminal-border bg-terminal-surface p-4 overflow-x-auto">
      <h3 className="mb-3 text-xs font-medium uppercase tracking-wider text-terminal-muted">
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

interface TickerPositionClientProps {
  data: TickerPositionManagerData;
}

export function TickerPositionClient({ data: initialData }: TickerPositionClientProps) {
  const [data, setData] = useState(initialData);
  const handleDividendSync = useCallback((refresh: DividendDependentRefreshData) => {
    setData(refresh.tickerData);
  }, []);
  useDividendDataSync(handleDividendSync);

  const [tab, setTab] = useState<MarketTab>("us");
  const { usMarket, sgMarket, report, dataSource } = data;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Ticker Position Manager"
        description="US and SG market performance — capital gains, premium & dividend income (My P/L only)"
        actions={
          <Badge variant={dataSource === "supabase" ? "success" : "outline"}>
            {dataSource === "supabase" ? "Live data" : "Mock data"}
          </Badge>
        }
      />

      <div className="rounded-lg border border-terminal-border bg-terminal-elevated/40 px-4 py-3 text-xs text-terminal-muted">
        Aggregates using <strong className="text-terminal-text">My P/L</strong>{" "}
        only — client share excluded. Premium and dividend income reduce adjusted
        cost basis. Dividend income syncs from Dividend Tracker. SG market has no
        options tracking.
      </div>

      <div className="flex gap-2">
        <Button
          variant={tab === "us" ? "secondary" : "ghost"}
          size="sm"
          onClick={() => setTab("us")}
        >
          US Market
        </Button>
        <Button
          variant={tab === "sg" ? "secondary" : "ghost"}
          size="sm"
          onClick={() => setTab("sg")}
        >
          SG Market
        </Button>
      </div>

      {tab === "us" ? (
        <section className="space-y-4">
          <h2 className="text-xs font-medium uppercase tracking-wider text-terminal-muted">
            US Market
          </h2>
          <UsMarketSummaryCards summary={usMarket.summary} />
          <UsMarketTable rows={usMarket.rows} />
        </section>
      ) : (
        <section className="space-y-4">
          <h2 className="text-xs font-medium uppercase tracking-wider text-terminal-muted">
            SG Market
          </h2>
          <SgMarketSummaryCards summary={sgMarket.summary} />
          <SgMarketTable rows={sgMarket.rows} />
        </section>
      )}

      <section className="space-y-4">
        <h2 className="text-xs font-medium uppercase tracking-wider text-terminal-muted">
          Leaderboards
        </h2>
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <LeaderboardTable
            title="Top Premium Generators"
            headers={["Ticker", "Premium Collected", "Premium Yield %"]}
            rows={report.topPremiumGenerators.map((r) => [
              r.ticker,
              formatTickerCurrency(r.premiumCollected),
              formatIncomeYieldPct(r.premiumYieldPct),
            ])}
          />
          <LeaderboardTable
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
          <LeaderboardTable
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
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="text-xs font-medium uppercase tracking-wider text-terminal-muted">
          Market Reports
        </h2>
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <LeaderboardTable
            title="Best Performing US Tickers"
            headers={["Ticker", "Total P/L", "Income Yield %"]}
            rows={report.usTopPerformers.map((r) => [
              r.ticker,
              formatSignedTickerCurrency(r.totalPnl),
              formatIncomeYieldPct(r.incomeYieldPct),
            ])}
          />
          <LeaderboardTable
            title="Worst Performing US Tickers"
            headers={["Ticker", "Total P/L", "Income Yield %"]}
            rows={report.usWorstPerformers.map((r) => [
              r.ticker,
              formatSignedTickerCurrency(r.totalPnl),
              formatIncomeYieldPct(r.incomeYieldPct),
            ])}
          />
          <LeaderboardTable
            title="Best Performing SG Tickers"
            headers={["Ticker", "Total P/L", "Income Yield %"]}
            rows={report.sgTopPerformers.map((r) => [
              r.ticker,
              formatSignedTickerCurrency(r.totalPnl),
              formatIncomeYieldPct(r.incomeYieldPct),
            ])}
          />
          <LeaderboardTable
            title="Worst Performing SG Tickers"
            headers={["Ticker", "Total P/L", "Income Yield %"]}
            rows={report.sgWorstPerformers.map((r) => [
              r.ticker,
              formatSignedTickerCurrency(r.totalPnl),
              formatIncomeYieldPct(r.incomeYieldPct),
            ])}
          />
          <LeaderboardTable
            title="Highest US Income Yield"
            headers={["Ticker", "Income Yield %", "Annual Passive"]}
            rows={report.usHighestIncomeYield.map((r) => [
              r.ticker,
              formatIncomeYieldPct(r.incomeYieldPct),
              formatTickerCurrency(
                r.annualPremiumIncome + r.annualDividendIncome
              ),
            ])}
          />
          <LeaderboardTable
            title="Highest SG Income Yield"
            headers={["Ticker", "Income Yield %", "Annual Dividend"]}
            rows={report.sgHighestIncomeYield.map((r) => [
              r.ticker,
              formatIncomeYieldPct(r.incomeYieldPct),
              formatTickerCurrency(r.annualDividendIncome),
            ])}
          />
        </div>
      </section>
    </div>
  );
}
