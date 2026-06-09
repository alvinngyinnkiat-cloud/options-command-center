"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
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
import type { IncomeFilter, MarketTab } from "@/lib/ticker-positions/market-types";
import {
  buildTabLeaderboards,
  filterIncomeRows,
  filterUnifiedRowsByTab,
  getMarketReportSections,
  getMarketTabHeader,
  shouldShowMarketReports,
} from "@/lib/ticker-positions/tab-views";
import {
  AllMarketGroupedTables,
  SgMarketGroupedTables,
  UsMarketGroupedTables,
} from "./PositionGroupTables";
import {
  AllMarketSummaryCards,
  IncomeSummaryCards,
  IncomeTable,
  PassiveIncomeGoalCard,
  SgMarketSummaryCards,
  UsMarketSummaryCards,
} from "./MarketTables";

const TAB_STORAGE_KEY = "portfolio-income-position-manager-tab";

const MARKET_TABS: { id: MarketTab; label: string }[] = [
  { id: "all", label: "ALL" },
  { id: "us", label: "US Market" },
  { id: "sg", label: "SG Market" },
  { id: "income", label: "Income" },
];

const INCOME_FILTERS: { id: IncomeFilter; label: string }[] = [
  { id: "all", label: "All Income" },
  { id: "dividends", label: "Dividends Only" },
  { id: "premium", label: "Premium Only" },
  { id: "highest_yield", label: "Highest Yield" },
  { id: "highest_income", label: "Highest Income" },
  { id: "us_only", label: "US Only" },
  { id: "sg_only", label: "SG Only" },
];

function isMarketTab(value: string | null): value is MarketTab {
  return value === "all" || value === "us" || value === "sg" || value === "income";
}

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

  const [tab, setTabState] = useState<MarketTab>("all");
  const [incomeFilter, setIncomeFilter] = useState<IncomeFilter>("all");

  useEffect(() => {
    const saved = localStorage.getItem(TAB_STORAGE_KEY);
    if (isMarketTab(saved)) setTabState(saved);
  }, []);

  const setTab = useCallback((next: MarketTab) => {
    setTabState(next);
    localStorage.setItem(TAB_STORAGE_KEY, next);
  }, []);

  const { usMarket, sgMarket, allMarketSummary, incomeTab, passiveIncomeGoal, report, dataSource } =
    data;

  const incomeRows = useMemo(
    () => filterIncomeRows(filterUnifiedRowsByTab("income", usMarket.rows, sgMarket.rows), incomeFilter),
    [usMarket.rows, sgMarket.rows, incomeFilter]
  );

  const leaderboards = useMemo(
    () => buildTabLeaderboards(tab, report, usMarket.rows, sgMarket.rows),
    [tab, report, usMarket.rows, sgMarket.rows]
  );

  const marketReports = useMemo(() => getMarketReportSections(tab, report), [tab, report]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Portfolio Income & Position Manager"
        description="Capital gains, premium & dividend income, passive income yield, and position performance (My P/L only)"
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

      <div className="flex flex-wrap gap-2">
        {MARKET_TABS.map(({ id, label }) => (
          <Button
            key={id}
            variant={tab === id ? "secondary" : "ghost"}
            size="sm"
            onClick={() => setTab(id)}
          >
            {label}
          </Button>
        ))}
      </div>

      <section className="space-y-4">
        <h2 className="text-xs font-medium uppercase tracking-wider text-terminal-muted">
          {getMarketTabHeader(tab)}
        </h2>

        {tab === "income" ? (
          <>
            <IncomeSummaryCards summary={incomeTab} />
            <PassiveIncomeGoalCard goal={passiveIncomeGoal} />
            <div className="flex flex-wrap gap-2">
              {INCOME_FILTERS.map(({ id, label }) => (
                <Button
                  key={id}
                  variant={incomeFilter === id ? "secondary" : "ghost"}
                  size="sm"
                  onClick={() => setIncomeFilter(id)}
                >
                  {label}
                </Button>
              ))}
            </div>
            <IncomeTable rows={incomeRows} />
          </>
        ) : (
          <>
            {tab === "all" && <AllMarketSummaryCards summary={allMarketSummary} />}
            {tab === "us" && <UsMarketSummaryCards summary={usMarket.summary} />}
            {tab === "sg" && <SgMarketSummaryCards summary={sgMarket.summary} />}

            {tab === "all" && (
              <AllMarketGroupedTables usRows={usMarket.rows} sgRows={sgMarket.rows} />
            )}
            {tab === "us" && <UsMarketGroupedTables rows={usMarket.rows} />}
            {tab === "sg" && <SgMarketGroupedTables rows={sgMarket.rows} />}
          </>
        )}
      </section>

      {(tab === "all" || tab === "us" || tab === "sg" || tab === "income") && (
        <section className="space-y-4">
          <h2 className="text-xs font-medium uppercase tracking-wider text-terminal-muted">
            Leaderboards
          </h2>
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            {leaderboards.showPremiumGenerators && (
              <LeaderboardTable
                title="Top Premium Generators"
                headers={["Ticker", "Premium Collected", "Premium Yield %"]}
                rows={leaderboards.topPremiumGenerators.map((r) => [
                  r.ticker,
                  formatTickerCurrency(r.premiumCollected),
                  formatIncomeYieldPct(r.premiumYieldPct),
                ])}
              />
            )}
            {leaderboards.showDividendGenerators && (
              <LeaderboardTable
                title="Top Dividend Generators"
                headers={["Ticker", "Annual Dividend", "Dividend Yield %"]}
                rows={leaderboards.topDividendGenerators.map((r) => [
                  r.ticker,
                  formatTickerCurrency(r.annualDividendIncome),
                  r.dividendYield != null
                    ? formatIncomeYieldPct(r.dividendYield)
                    : "—",
                ])}
              />
            )}
            {leaderboards.showPassiveIncomeGenerators && (
              <LeaderboardTable
                title="Top Passive Income Generators"
                headers={[
                  "Ticker",
                  "Premium Income",
                  "Dividend Income",
                  "Total Passive Income",
                  "Income Yield %",
                ]}
                rows={leaderboards.topPassiveIncomeGenerators.map((r) => [
                  r.ticker,
                  formatTickerCurrency(r.premiumIncome),
                  formatTickerCurrency(r.dividendIncome),
                  formatTickerCurrency(r.totalPassiveIncome),
                  formatIncomeYieldPct(r.incomeYieldPct),
                ])}
              />
            )}
          </div>
        </section>
      )}

      {shouldShowMarketReports(tab) && (
        <section className="space-y-4">
          <h2 className="text-xs font-medium uppercase tracking-wider text-terminal-muted">
            Market Reports
          </h2>
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <LeaderboardTable
              title={marketReports.bestLabel}
              headers={["Ticker", "Total P/L", "Income Yield %"]}
              rows={marketReports.bestPerformers.map((r) => [
                r.ticker,
                formatSignedTickerCurrency(r.totalPnl),
                formatIncomeYieldPct(r.incomeYieldPct),
              ])}
            />
            <LeaderboardTable
              title={marketReports.worstLabel}
              headers={["Ticker", "Total P/L", "Income Yield %"]}
              rows={marketReports.worstPerformers.map((r) => [
                r.ticker,
                formatSignedTickerCurrency(r.totalPnl),
                formatIncomeYieldPct(r.incomeYieldPct),
              ])}
            />
            <LeaderboardTable
              title={marketReports.yieldLabel}
              headers={["Ticker", "Income Yield %", "Annual Passive"]}
              rows={marketReports.highestIncomeYield.map((r) => [
                r.ticker,
                formatIncomeYieldPct(r.incomeYieldPct),
                formatTickerCurrency(
                  "annualPremiumIncome" in r
                    ? r.annualPremiumIncome + r.annualDividendIncome
                    : r.annualDividendIncome
                ),
              ])}
            />
          </div>
        </section>
      )}
    </div>
  );
}
