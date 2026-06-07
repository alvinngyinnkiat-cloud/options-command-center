import { CATEGORY_LIMITS } from "@/lib/auto-watchlist/constants";
import { getActiveDividendProvider } from "@/lib/dividends/dividend-data-service";
import {
  formatRelativeAge,
  isStaleCalendarDays,
  needsWeekendReview,
} from "@/lib/data-health/freshness";
import type {
  DataSourceHealthReport,
  DataSourceHealthStatus,
} from "@/lib/data-health/types";
import { MOCK_REFERENCE_DATE } from "@/lib/mock/reference-dates";
import { getAutoWatchlistPageData } from "@/lib/supabase/queries/auto-watchlist";
import { listDividendRecordRows } from "@/lib/supabase/queries/dividend-records";
import { listDailyPortfolioSnapshots } from "@/lib/supabase/queries/daily-portfolio-snapshots";
import { getLastLogForSource } from "@/lib/supabase/queries/data-source-logs";
import { getMonthlyContributionTrackerData } from "@/lib/supabase/queries/monthly-contributions";
import { getOptionsTradesData } from "@/lib/supabase/queries/options-trades";
import { getPortfolioDashboardData } from "@/lib/supabase/queries/portfolio";
import { getWatchlistScannerData } from "@/lib/supabase/queries/watchlist-scanner";
import { isSupabaseConfigured } from "@/lib/supabase/is-configured";
import { createClient } from "@/lib/supabase/server";
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

async function fetchMarketDataRows(userId: string): Promise<MarketData[]> {
  if (!isSupabaseConfigured()) return [];

  const supabase = await createClient();
  const { data: watchlist } = await supabase
    .from("watchlist")
    .select("id")
    .eq("user_id", userId);

  const ids = (watchlist ?? []).map((w) => (w as { id: string }).id);
  if (ids.length === 0) return [];

  const { data } = await supabase
    .from("market_data")
    .select("*")
    .in("watchlist_id", ids);

  return (data ?? []) as MarketData[];
}

export async function auditMarketData(
  userId: string
): Promise<DataSourceHealthReport> {
  const logs = await getLastLogForSource(userId, "market_data");
  const rows = await fetchMarketDataRows(userId);
  const apiKey = process.env.MARKET_DATA_API_KEY;
  const fmpKey = process.env.FMP_API_KEY;
  const providerName = apiKey
    ? "Market Data API (configured)"
    : fmpKey
      ? "FMP (OHLCV sync not wired — Supabase/manual)"
      : "Mock / Supabase stored quotes";

  const byTicker = new Map<string, MarketData>();
  for (const row of rows) {
    const existing = byTicker.get(row.ticker);
    if (
      !existing ||
      row.price_date > existing.price_date
    ) {
      byTicker.set(row.ticker, row);
    }
  }

  const latestDates = [...byTicker.values()].map((r) => r.price_date);
  const latestDate =
    latestDates.length > 0
      ? latestDates.sort().reverse()[0]
      : null;

  const staleTickers = [...byTicker.entries()]
    .filter(([, r]) => isStaleCalendarDays(r.price_date, REF, 1))
    .map(([t]) => t);

  let status: DataSourceHealthStatus = "healthy";
  if (!apiKey && rows.length === 0) {
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
        ? `${byTicker.size} tickers · latest ${latestDate ?? "—"}`
        : "No OHLCV rows in Supabase — quotes served from mock fixtures",
    details: [
      { label: "Provider", value: providerName },
      {
        label: "API status",
        value: apiKey ? "Key configured (server-side)" : "No live OHLCV sync",
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
        value: "Open, High, Low, Close, Volume, 52W range, Market Cap",
      },
      {
        label: "Fetch path",
        value: "Server reads Supabase market_data after refresh (no client API calls)",
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
  const scanner = await getWatchlistScannerData();
  const rows = scanner.rows;

  const missing: string[] = [];
  const invalid: string[] = [];

  for (const row of rows) {
    const t = row.technicals;
    if (
      t.atr14 == null ||
      t.ema20 == null ||
      t.sma50 == null ||
      t.sma200 == null ||
      t.stochastic == null
    ) {
      missing.push(row.ticker);
    }
    if (
      (t.stochastic != null && (t.stochastic < 0 || t.stochastic > 100)) ||
      (t.atr14 != null && t.atr14 < 0)
    ) {
      invalid.push(row.ticker);
    }
  }

  const indicatorSource =
    scanner.dataSource === "supabase"
      ? "Mock technical fixtures (live indicator pipeline not wired)"
      : "Mock technical fixtures";

  const stale = false;

  let status: DataSourceHealthStatus =
    missing.length === 0 && invalid.length === 0 ? "healthy" : "warning";
  if (indicatorSource.includes("Mock")) status = "warning";
  if (stale) status = worstStatus(status, "warning");

  return {
    id: "technical_indicators",
    title: "Technical Indicator Data",
    status,
    summary: `${rows.length} watchlist tickers scored · ${indicatorSource}`,
    details: [
      { label: "Source", value: indicatorSource },
      {
        label: "Last updated",
        value: "On scanner load (mock indicator fixtures)",
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
        value: "Refresh Technical Indicators recomputes scanner scores server-side",
      },
    ],
    lastSuccessfulUpdate: logs.success?.completed_at ?? null,
    lastFailedUpdate: logs.failed?.completed_at ?? null,
  };
}

export async function auditAutoWatchlist(
  userId: string
): Promise<DataSourceHealthReport> {
  const logs = await getLastLogForSource(userId, "auto_watchlist");
  const data = await getAutoWatchlistPageData();

  const categoryStats = data.categories.map((c) => {
    const requested = CATEGORY_LIMITS[c.id];
    const returned = c.entries.length;
    const qualified = returned;
    const reason =
      returned < requested
        ? `Only ${qualified} qualified (requested ${requested})`
        : "Full quota";
    return {
      name: c.title,
      requested,
      qualified,
      returned,
      reason,
    };
  });

  const stale = isStaleCalendarDays(data.generatedAt, REF, 7);
  let status: DataSourceHealthStatus = stale ? "warning" : "healthy";
  if (data.marketDataSource === "mock") {
    status = worstStatus(status, "warning");
  }

  return {
    id: "auto_watchlist",
    title: "Auto Watchlist Data",
    status,
    summary: data.generatedAt
      ? `Generated ${formatRelativeAge(data.generatedAt, REF)}`
      : "Not generated yet",
    details: [
      {
        label: "Market data source",
        value: data.marketDataSource === "api" ? "API" : "Mock provider",
      },
      {
        label: "Last generated",
        value: data.generatedAt ?? "Never",
      },
      ...categoryStats.flatMap((s) => [
        {
          label: `${s.name} requested`,
          value: String(s.requested),
        },
        {
          label: `${s.name} returned`,
          value: `${s.returned} — ${s.reason}`,
        },
      ]),
    ],
    lastSuccessfulUpdate: logs.success?.completed_at ?? data.generatedAt,
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
  if (provider.name === "mock") status = "warning";
  if (stale && records.length > 0) status = worstStatus(status, "warning");
  if (logs.failed && !logs.success) status = "failed";

  return {
    id: "dividend_data",
    title: "Dividend Data",
    status,
    summary: `${records.length} records · provider ${provider.name.toUpperCase()}`,
    details: [
      { label: "Dividend provider", value: provider.name.toUpperCase() },
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
  const snapshots = await listDailyPortfolioSnapshots(userId);
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

  const latestSnapshot = snapshots[snapshots.length - 1];
  const noRecordToday =
    !latestSnapshot || latestSnapshot.snapshotDate !== REF;

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
          ? `No record for ${REF}`
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
    lastSuccessfulUpdate:
      latestSnapshot?.snapshotDate ?? portfolio.override?.overrideUpdatedAt ?? null,
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

export async function runAllAudits(userId: string): Promise<DataSourceHealthReport[]> {
  return Promise.all([
    auditMarketData(userId),
    auditTechnicalIndicators(userId),
    auditAutoWatchlist(userId),
    auditDividendData(userId),
    auditManualData(userId),
    auditOptionsTrades(userId),
  ]);
}
