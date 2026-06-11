import { formatRelativeAge, isStaleCalendarDays, needsWeekendReview } from "@/lib/data-health/freshness";
import { getActiveDividendProvider } from "@/lib/dividends/dividend-data-service";
import {
  SG_STOCK_PRICE_LOG_SOURCE,
  US_STOCK_ETF_PRICE_LOG_SOURCE,
} from "@/lib/stocks-etfs/sync-holding-market-prices";
import { formatSgtDateTime } from "@/lib/time/singapore-time";
import type {
  DataSourceHealthReport,
  DataSourceHealthStatus,
} from "@/lib/data-health/types";
import { lastCompletedTradingDate } from "@/lib/market-calendar/nyse-calendar";
import {
  EXCLUDED_SNAPSHOT_DATE,
  filterRealPortfolioSnapshots,
  selectLatestSnapshot,
} from "@/lib/portfolio/snapshot-history";
import { getSingaporeSnapshotDate } from "@/lib/portfolio/snapshot-date";
import { getActiveMarketDataProvider } from "@/lib/watchlist/market-data-provider";
import {
  countActiveWatchlistItems,
  fetchActiveWatchlistItems,
} from "@/lib/watchlist/active-watchlist";
import { MOCK_REFERENCE_DATE } from "@/lib/mock/reference-dates";
import { getLatestDailySnapshot, listDailyPortfolioSnapshots } from "@/lib/supabase/queries/daily-portfolio-snapshots";
import { getLastLogForSource } from "@/lib/supabase/queries/data-source-logs";
import { listDividendRecordRows } from "@/lib/supabase/queries/dividend-records";
import { getMonthlyContributionTrackerData } from "@/lib/supabase/queries/monthly-contributions";
import { getOptionsTradesData } from "@/lib/supabase/queries/options-trades";
import { getPortfolioDashboardData } from "@/lib/supabase/queries/portfolio";
import { getWatchlistScannerData } from "@/lib/supabase/queries/watchlist-scanner";
import { isSupabaseConfigured } from "@/lib/supabase/is-configured";
import { withSupabaseQuery } from "@/lib/supabase/resolve-user";
import type { MarketData } from "@/types/database";

const REF = MOCK_REFERENCE_DATE;

function worstStatus(
  ...statuses: DataSourceHealthStatus[]
): DataSourceHealthStatus {
  if (statuses.includes("failed")) return "failed";
  if (statuses.includes("manual_required")) return "manual_required";
  if (statuses.includes("warning")) return "warning";
  return "healthy";
}

async function fetchMarketDataRows(_userId: string): Promise<
  Pick<MarketData, "watchlist_id" | "ticker" | "price_date">[]
> {
  if (!isSupabaseConfigured()) return [];

  const items = await fetchActiveWatchlistItems();
  const ids = items.map((i) => i.id);
  if (ids.length === 0) return [];

  const completedTarget = lastCompletedTradingDate();

  return withSupabaseQuery(
    async ({ supabase }) => {
      const { data } = await supabase
        .from("market_data")
        .select("watchlist_id, ticker, price_date")
        .in("watchlist_id", ids)
        .eq("price_date", completedTarget);

      return (data ?? []) as Pick<
        MarketData,
        "watchlist_id" | "ticker" | "price_date"
      >[];
    },
    () => []
  );
}

export async function auditMarketData(
  userId: string
): Promise<DataSourceHealthReport> {
  const logs = await getLastLogForSource(userId, "market_data");
  const [rows, activeCount] = await Promise.all([
    fetchMarketDataRows(userId),
    countActiveWatchlistItems(),
  ]);
  const provider = getActiveMarketDataProvider();
  const completedTarget = lastCompletedTradingDate();
  const providerName = provider
    ? "FMP daily OHLCV (completed candles)"
    : "FMP_API_KEY not configured";

  const byTicker = new Map<string, Pick<MarketData, "watchlist_id" | "ticker" | "price_date">>();
  for (const row of rows) {
    byTicker.set(row.ticker, row);
  }

  const activeItems = await fetchActiveWatchlistItems();
  const staleTickers = activeItems
    .filter((item) => !byTicker.has(item.ticker.toUpperCase()))
    .map((item) => item.ticker);

  const latestDate = byTicker.size > 0 ? completedTarget : null;

  let status: DataSourceHealthStatus = "healthy";
  if (!provider) {
    status = "warning";
  }
  if (staleTickers.length > 0 && byTicker.size > 0) {
    status = worstStatus(status, "warning");
  }
  if (byTicker.size === 0) {
    status = "warning";
  }

  return {
    id: "market_data",
    title: "Market Data API",
    status,
    summary:
      byTicker.size > 0
        ? `${activeCount} active · ${byTicker.size} with OHLCV · latest ${latestDate ?? "—"} · target ${completedTarget}`
        : activeCount > 0
          ? `${activeCount} active tickers · no OHLCV rows — run Refresh Market Data`
          : "No active watchlist tickers — add tickers on Watchlist page",
    details: [
      { label: "Provider", value: providerName },
      {
        label: "Active watchlist tickers",
        value: String(activeCount),
      },
      {
        label: "Completed candle target",
        value: completedTarget,
      },
      { label: "Tickers updated", value: String(byTicker.size) },
      {
        label: "Failed / stale tickers",
        value:
          staleTickers.length > 0
            ? staleTickers.slice(0, 8).join(", ") +
              (staleTickers.length > 8 ? "…" : "")
            : "None",
      },
      {
        label: "Used for",
        value: "Open, High, Low, Close — Average Price = (High + Low) / 2",
      },
      {
        label: "Fetch path",
        value: "FMP EOD → market_data table → Watchlist Scanner",
      },
    ],
    lastSuccessfulUpdate: logs.success?.completed_at ?? latestDate,
    lastFailedUpdate: logs.failed?.completed_at ?? null,
  };
}

export async function auditTechnicalIndicators(
  userId: string
): Promise<DataSourceHealthReport> {
  const logs = await getLastLogForSource(userId, "technical_indicators");
  const [activeItems, scanner] = await Promise.all([
    fetchActiveWatchlistItems(),
    getWatchlistScannerData(),
  ]);
  const activeCount = activeItems.length;
  const rows = scanner.rows;
  const completedTarget = lastCompletedTradingDate();

  const missing: string[] = [];
  const invalid: string[] = [];

  for (const row of rows) {
    const t = row.technicals;
    if (
      t.atr14 <= 0 ||
      t.ema20 <= 0 ||
      t.sma50 <= 0 ||
      t.sma200 <= 0 ||
      t.stochastic < 0 ||
      t.stochastic > 100
    ) {
      if (t.atr14 <= 0 || t.ema20 <= 0 || t.sma50 <= 0 || t.sma200 <= 0) {
        missing.push(row.ticker);
      }
      if (t.stochastic < 0 || t.stochastic > 100 || t.atr14 < 0) {
        invalid.push(row.ticker);
      }
    }
  }

  const indicatorSource =
    scanner.dataSource === "supabase"
      ? "Computed from completed daily candles (market_data)"
      : "Mock fixtures (development mode)";

  let status: DataSourceHealthStatus =
    missing.length === 0 && invalid.length === 0 ? "healthy" : "warning";
  if (scanner.dataSource === "mock") status = "warning";

  return {
    id: "technical_indicators",
    title: "Technical Indicator Data",
    status,
    summary: `${activeCount} active watchlist tickers · ${indicatorSource}`,
    details: [
      { label: "Source", value: indicatorSource },
      {
        label: "Active watchlist tickers",
        value: String(activeCount),
      },
      {
        label: "Indicator date target",
        value: completedTarget,
      },
      {
        label: "Missing indicators",
        value: missing.length ? missing.join(", ") : "None",
      },
      {
        label: "Invalid values",
        value: invalid.length ? invalid.join(", ") : "None",
      },
      {
        label: "Indicators tracked",
        value: "ATR(14), EMA20, SMA50, SMA200, Stochastic",
      },
      {
        label: "Update path",
        value: "Refresh → FMP candles → compute → technical_indicators → scanner scores",
      },
    ],
    lastSuccessfulUpdate: logs.success?.completed_at ?? null,
    lastFailedUpdate: logs.failed?.completed_at ?? null,
  };
}

export async function auditDividendData(
  userId: string
): Promise<DataSourceHealthReport> {
  const logs = await getLastLogForSource(userId, "dividend_data");
  const provider = getActiveDividendProvider();
  const records = await listDividendRecordRows(userId);

  const upcoming = records.filter(
    (r) => r.status === "upcoming" || r.status === "estimated"
  );
  const received = records.filter(
    (r) => r.is_received || r.status === "received"
  );
  const manualOverrides = records.filter((r) => r.is_manual_override);
  const holdingsWithShares = new Set(
    records.map((r) => r.ticker.toUpperCase())
  );

  const lastSync = logs.success?.completed_at ?? null;
  const stale = isStaleCalendarDays(lastSync?.slice(0, 10) ?? null, REF, 7);

  let status: DataSourceHealthStatus = "healthy";
  if (!provider) status = "warning";
  if (stale && records.length > 0) status = worstStatus(status, "warning");
  if (logs.failed && !logs.success) status = "failed";

  return {
    id: "dividend_data",
    title: "Dividend Data",
    status,
    summary: `${records.length} records · provider ${(provider?.name ?? "none").toUpperCase()}`,
    details: [
      { label: "Dividend provider", value: (provider?.name ?? "none").toUpperCase() },
      {
        label: "Last dividend sync",
        value: formatRelativeAge(lastSync?.slice(0, 10) ?? null, REF),
      },
      { label: "Upcoming dividends", value: String(upcoming.length) },
      { label: "Received dividends", value: String(received.length) },
      { label: "Manual overrides", value: String(manualOverrides.length) },
      {
        label: "Tickers with dividend data",
        value: String(holdingsWithShares.size),
      },
      {
        label: "Downstream consumers",
        value:
          "Dividend Tracker, Stock & ETF, Ticker Positions, Portfolio, Goals",
      },
    ],
    lastSuccessfulUpdate: lastSync,
    lastFailedUpdate: logs.failed?.completed_at ?? null,
  };
}

export async function auditManualData(
  userId: string
): Promise<DataSourceHealthReport> {
  const scanner = await getWatchlistScannerData();
  const portfolio = await getPortfolioDashboardData();
  const asOfDate = getSingaporeSnapshotDate();
  const rawSnapshots = await listDailyPortfolioSnapshots(userId);
  const snapshots = filterRealPortfolioSnapshots(rawSnapshots);
  const latestSnapshot =
    (await getLatestDailySnapshot(userId)) ??
    selectLatestSnapshot(snapshots, asOfDate);
  const contributions = await getMonthlyContributionTrackerData();

  const srRows = scanner.rows.map((r) => r.supportResistance);
  const missingSr = scanner.rows
    .filter(
      (r) =>
        r.supportResistance.support1 == null &&
        r.supportResistance.resistance1 == null
    )
    .map((r) => r.ticker);

  const needsReview = scanner.rows
    .filter((r) =>
      needsWeekendReview(r.supportResistance.updateDate, REF)
    )
    .map((r) => r.ticker);

  const noRecordToday =
    !latestSnapshot || latestSnapshot.snapshotDate !== asOfDate;

  const overrideRaw = portfolio.override?.overrideUpdatedAt?.slice(0, 10) ?? null;
  const safeOverrideDate =
    overrideRaw && overrideRaw !== EXCLUDED_SNAPSHOT_DATE
      ? overrideRaw
      : null;

  const lastManualSuccess =
    latestSnapshot?.snapshotDate ??
    safeOverrideDate ??
    null;

  const openTrades = (await getOptionsTradesData()).trades.filter(
    (t) =>
      t.status === "open" ||
      t.status === "managed" ||
      t.status === "closing"
  );
  const staleOptionValues = openTrades
    .filter((t) => {
      const src = t.currentValueSource;
      return (
        t.calculations.currentCloseCost <= 0 ||
        (src === "manual" &&
          isStaleCalendarDays(t.updatedAt.slice(0, 10), REF, 1))
      );
    })
    .map((t) => t.ticker);

  let status: DataSourceHealthStatus = "manual_required";
  if (missingSr.length === 0 && needsReview.length === 0 && !noRecordToday) {
    status = "healthy";
  } else if (needsReview.length > 0 || noRecordToday || missingSr.length > 0) {
    status = "warning";
  }

  return {
    id: "manual_data",
    title: "Manual Data",
    status,
    summary: "Support/resistance, portfolio values, contributions — user maintained",
    details: [
      {
        label: "Support/Resistance policy",
        value: "Manual only — never auto-generated",
      },
      {
        label: "Tickers missing S/R",
        value: missingSr.length ? missingSr.join(", ") : "None",
      },
      {
        label: "S/R needs weekend review",
        value: needsReview.length ? needsReview.join(", ") : "Up to date",
      },
      {
        label: "Portfolio override",
        value: portfolio.override?.useManualOverride
          ? `Active · ${portfolio.override.overrideUpdatedAt?.slice(0, 10) ?? "—"}`
          : "Not active",
      },
      {
        label: "Daily portfolio record",
        value: noRecordToday
          ? `No record for ${asOfDate}`
          : `Recorded ${latestSnapshot!.snapshotDate}`,
      },
      {
        label: "Monthly contributions (YTD)",
        value: String(contributions.contributions.length),
      },
      {
        label: "Stale option values",
        value: staleOptionValues.length
          ? staleOptionValues.join(", ")
          : "None",
      },
    ],
    lastSuccessfulUpdate: lastManualSuccess,
    lastFailedUpdate: null,
  };
}

export async function auditOptionsTrades(
  userId: string
): Promise<DataSourceHealthReport> {
  void userId;
  const { trades } = await getOptionsTradesData();
  const open = trades.filter(
    (t) =>
      t.status === "open" ||
      t.status === "managed" ||
      t.status === "closing"
  );

  const missingValue = open.filter(
    (t) => t.calculations.currentCloseCost <= 0
  );
  const missingBreakeven = open.filter(
    (t) => t.calculations.breakevenPrice == null
  );
  const missingDte = open.filter((t) => t.calculations.dte == null);
  const clientTrades = open.filter((t) => t.isClientTrade);
  const clientMissingSplit = clientTrades.filter(
    (t) =>
      t.tradeOwnership !== "client_profit_sharing" ||
      t.clientProfitSharePercent <= 0
  );

  let status: DataSourceHealthStatus = "healthy";
  if (
    missingValue.length ||
    missingBreakeven.length ||
    missingDte.length ||
    clientMissingSplit.length
  ) {
    status = "warning";
  }

  return {
    id: "options_trades",
    title: "Options Trade Data",
    status,
    summary: `${open.length} open trades tracked`,
    details: [
      { label: "Open trades", value: String(open.length) },
      {
        label: "Missing current option value",
        value: missingValue.length
          ? missingValue.map((t) => t.ticker).join(", ")
          : "None",
      },
      {
        label: "Missing breakeven",
        value: missingBreakeven.length
          ? missingBreakeven.map((t) => t.ticker).join(", ")
          : "None",
      },
      {
        label: "Missing DTE",
        value: missingDte.length
          ? missingDte.map((t) => t.ticker).join(", ")
          : "None",
      },
      {
        label: "Client profit-sharing trades",
        value: String(clientTrades.length),
      },
      {
        label: "Client split issues",
        value: clientMissingSplit.length
          ? clientMissingSplit.map((t) => t.ticker).join(", ")
          : "None",
      },
    ],
    lastSuccessfulUpdate: null,
    lastFailedUpdate: null,
  };
}

export async function auditCryptoManual(
  userId: string
): Promise<DataSourceHealthReport> {
  void userId;
  return {
    id: "crypto_manual",
    title: "Crypto Tracker",
    status: "healthy",
    summary: "Manual update — no live price feed",
    details: [
      { label: "Update mode", value: "Manual Update" },
      {
        label: "Price feed",
        value: "Disabled — user-entered SGD values only",
      },
      {
        label: "Stale price check",
        value: "Not applicable — crypto prices are not auto-fetched",
      },
      {
        label: "P/L formula",
        value: "Current Crypto Value SGD − Total Contributions / Cost SGD",
      },
      {
        label: "Trading Capital",
        value: "Crypto value and crypto cash excluded",
      },
    ],
    lastSuccessfulUpdate: null,
    lastFailedUpdate: null,
  };
}

export async function auditUsStockEtfPrices(
  userId: string
): Promise<DataSourceHealthReport> {
  const logs = await getLastLogForSource(userId, US_STOCK_ETF_PRICE_LOG_SOURCE);
  const last = logs.success ?? logs.failed;
  const failedMatch = last?.error_message?.match(/Failed: (.+)/);
  const failedTickers = failedMatch
    ? failedMatch[1]!.split(", ").filter(Boolean)
    : [];

  let status: DataSourceHealthStatus = "healthy";
  if (!last) status = "warning";
  else if (last.status === "failed") status = "failed";
  else if (last.status === "partial") status = "warning";

  return {
    id: "us_stock_etf_prices",
    title: "US Stock/ETF Price Refresh",
    status,
    summary: last
      ? `Last refresh ${formatRelativeAge(last.completed_at?.slice(0, 10) ?? null, REF)} · ${last.records_updated} updated`
      : "No US price refresh logs yet — scheduled 06:00 SGT daily",
    details: [
      {
        label: "Schedule",
        value: "06:00 SGT daily (completed US daily candle)",
      },
      {
        label: "Last refresh",
        value: last?.completed_at
          ? formatSgtDateTime(last.completed_at)
          : "Never",
      },
      {
        label: "Rows updated",
        value: last ? String(last.records_updated) : "—",
      },
      {
        label: "Failed tickers",
        value: failedTickers.length ? failedTickers.join(", ") : "None",
      },
      {
        label: "Formula",
        value: "Current Value = Shares × latest completed US close",
      },
    ],
    lastSuccessfulUpdate: logs.success?.completed_at ?? null,
    lastFailedUpdate: logs.failed?.completed_at ?? null,
  };
}

export async function auditSgStockPrices(
  userId: string
): Promise<DataSourceHealthReport> {
  const logs = await getLastLogForSource(userId, SG_STOCK_PRICE_LOG_SOURCE);
  const last = logs.success ?? logs.failed;
  const failedMatch = last?.error_message?.match(/Failed: (.+)/);
  const failedTickers = failedMatch
    ? failedMatch[1]!.split(", ").filter(Boolean)
    : [];

  let status: DataSourceHealthStatus = "healthy";
  if (!last) status = "warning";
  else if (last.status === "failed") status = "failed";
  else if (last.status === "partial") status = "warning";

  return {
    id: "sg_stock_prices",
    title: "SG Stock Price Refresh",
    status,
    summary: last
      ? `Last refresh ${formatRelativeAge(last.completed_at?.slice(0, 10) ?? null, REF)} · ${last.records_updated} updated`
      : "No SG price refresh logs yet — scheduled 17:30 SGT daily",
    details: [
      {
        label: "Schedule",
        value: "17:30 SGT daily (completed SGX daily candle)",
      },
      {
        label: "Last refresh",
        value: last?.completed_at
          ? formatSgtDateTime(last.completed_at)
          : "Never",
      },
      {
        label: "Rows updated",
        value: last ? String(last.records_updated) : "—",
      },
      {
        label: "Failed tickers",
        value: failedTickers.length ? failedTickers.join(", ") : "None",
      },
      {
        label: "Yahoo symbol format",
        value: "DBS→D05.SI, C38U→C38U.SI, ES3→ES3.SI",
      },
    ],
    lastSuccessfulUpdate: logs.success?.completed_at ?? null,
    lastFailedUpdate: logs.failed?.completed_at ?? null,
  };
}

export async function runAllAudits(userId: string): Promise<DataSourceHealthReport[]> {
  return Promise.all([
    auditMarketData(userId),
    auditTechnicalIndicators(userId),
    auditUsStockEtfPrices(userId),
    auditSgStockPrices(userId),
    auditDividendData(userId),
    auditManualData(userId),
    auditOptionsTrades(userId),
    auditCryptoManual(userId),
  ]);
}
