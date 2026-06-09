import { buildPortfolioMetrics } from "@/lib/portfolio/calculations";
import {
  calculateMarketValueSgd,
  DEFAULT_USD_SGD_RATE,
  resolveFxRateToSgd,
} from "@/lib/portfolio/currency";
import { buildSnapshotSummariesFromDailyRows } from "@/lib/portfolio/daily-snapshot";
import type {
  HoldingInput,
  OpenPositionSummary,
  PortfolioMetrics,
  PortfolioOverrideInput,
  PortfolioRawInput,
} from "@/lib/portfolio/types";
import { STRATEGY_LABELS } from "@/lib/portfolio/types";
import { applyCryptoTrackerToPortfolioRaw } from "@/lib/portfolio/crypto-integration";
import { applyStockEtfTrackerToPortfolioRaw } from "@/lib/portfolio/stock-etf-integration";
import { getMockPortfolioRawWithHoldings } from "@/lib/mock/portfolio-holdings-store";
import { getCryptoHoldingsRows } from "@/lib/supabase/queries/crypto-holdings";
import { getStockEtfHoldingsRows } from "@/lib/supabase/queries/stock-etf-holdings";
import { calculatePnLFromOptionsRow } from "@/lib/trades/pnl-allocation";
import { readSupabasePrimary } from "@/lib/supabase/data-access";
import { withSupabaseQuery } from "@/lib/supabase/resolve-user";
import type {
  AssetType,
  CurrencyCode,
  DailyPortfolioSnapshot,
  Holding,
  OptionsTrade,
  PortfolioOverride,
} from "@/types/database";

function mapOpenPosition(trade: OptionsTrade): OpenPositionSummary {
  const allocation = calculatePnLFromOptionsRow(trade);
  return {
    id: trade.id,
    symbol: trade.ticker,
    strategy: STRATEGY_LABELS[trade.strategy],
    dte: trade.dte,
    pnl: allocation.myPnl,
    totalTradePnl: allocation.totalTradePnl,
    clientPnl: allocation.clientPnl,
    pnlPercent: Number(trade.pnl_percent),
    status: trade.status,
    isClientTrade: trade.trade_ownership === "client_profit_sharing",
  };
}

function mapOverride(row: PortfolioOverride | null): PortfolioOverrideInput | null {
  if (!row) return null;

  const legacyUsSgd =
    row.manual_us_stocks_options_sgd_equivalent != null
      ? Number(row.manual_us_stocks_options_sgd_equivalent)
      : row.manual_stocks_value_sgd != null
        ? Number(row.manual_stocks_value_sgd)
        : null;

  return {
    useManualOverride: row.use_manual_override,
    manualUsStocksOptionsValueUsd:
      row.manual_us_stocks_options_value_usd != null
        ? Number(row.manual_us_stocks_options_value_usd)
        : null,
    manualUsStocksOptionsSgdEquivalent: legacyUsSgd,
    manualCryptoValueSgd:
      row.manual_crypto_value_sgd != null
        ? Number(row.manual_crypto_value_sgd)
        : null,
    manualSgStocksCashValueSgd:
      row.manual_sg_stocks_cash_value_sgd != null
        ? Number(row.manual_sg_stocks_cash_value_sgd)
        : null,
    manualSgStocksValueSgd:
      row.manual_sg_stocks_value_sgd != null
        ? Number(row.manual_sg_stocks_value_sgd)
        : null,
    manualSgCashValueSgd:
      row.manual_sg_cash_value_sgd != null
        ? Number(row.manual_sg_cash_value_sgd)
        : null,
    manualTradingCashUsd:
      row.manual_trading_cash_usd != null
        ? Number(row.manual_trading_cash_usd)
        : null,
    manualTradingCashSgd:
      row.manual_trading_cash_sgd != null
        ? Number(row.manual_trading_cash_sgd)
        : row.manual_cash_value_sgd != null
          ? Number(row.manual_cash_value_sgd)
          : null,
    manualCryptoCashSgd: Number(row.manual_crypto_cash_sgd ?? 0),
    manualCryptoHoldingsSgd:
      row.manual_crypto_holdings_sgd != null
        ? Number(row.manual_crypto_holdings_sgd)
        : null,
    manualCryptoContributionsSgd:
      row.manual_crypto_contributions_sgd != null
        ? Number(row.manual_crypto_contributions_sgd)
        : null,
    manualClientPortfolioSgd: Number(row.manual_client_portfolio_sgd ?? 0),
    manualUsdSgdRate: Number(row.manual_usd_sgd_rate),
    manualTotalPortfolioValueSgd:
      row.manual_total_portfolio_value_sgd != null
        ? Number(row.manual_total_portfolio_value_sgd)
        : null,
    overrideReason: row.override_reason,
    overrideUpdatedAt: row.override_updated_at,
  };
}

function mapHolding(h: Holding, defaultUsdRate: number): HoldingInput {
  const currency = (h.currency ?? "USD") as CurrencyCode;
  const native =
    h.market_value_native != null
      ? Number(h.market_value_native)
      : Number(h.market_value);
  const fxRate = resolveFxRateToSgd(
    currency,
    h.fx_rate_to_sgd != null ? Number(h.fx_rate_to_sgd) : null,
    defaultUsdRate
  );
  const market_value_sgd =
    h.market_value_sgd != null && Number(h.market_value_sgd) > 0
      ? Number(h.market_value_sgd)
      : calculateMarketValueSgd(native, currency, fxRate);

  return {
    ticker: h.ticker,
    asset_type: h.asset_type as AssetType,
    currency,
    market_value_native: native,
    fx_rate_to_sgd: fxRate,
    market_value_sgd,
    market_value: market_value_sgd,
    cost_basis: h.cost_basis != null ? Number(h.cost_basis) : null,
  };
}

function countExpiringThisWeek(trades: OptionsTrade[]): number {
  const now = new Date();
  const weekEnd = new Date(now);
  weekEnd.setDate(now.getDate() + 7);
  return trades.filter((t) => {
    const exp = new Date(t.expiration_date);
    return exp >= now && exp <= weekEnd;
  }).length;
}

function estimateOptionsAllocationPct(
  holdings: HoldingInput[],
  portfolioValue: number
): number {
  if (portfolioValue <= 0) return 0;
  const optionsValue = holdings
    .filter((h) => h.asset_type === "option")
    .reduce((sum, h) => sum + h.market_value_sgd, 0);
  return (optionsValue / portfolioValue) * 100;
}

async function fetchRawFromSupabase(_userId: string): Promise<PortfolioRawInput | null> {
  return withSupabaseQuery(
    async ({ userId, supabase }) => {
      const [dailySnapshotsRes, holdingsRes, tradesRes, overrideRes] =
        await Promise.all([
          supabase
            .from("daily_portfolio_snapshots")
            .select("*")
            .eq("user_id", userId)
            .order("snapshot_date", { ascending: false })
            .limit(6),
          supabase
            .from("holdings")
            .select("*")
            .eq("user_id", userId)
            .is("snapshot_id", null),
          supabase
            .from("options_trades")
            .select("*")
            .eq("user_id", userId)
            .in("status", ["open", "closing", "managed"]),
          supabase
            .from("portfolio_overrides")
            .select("*")
            .eq("user_id", userId)
            .maybeSingle(),
        ]);

      if (dailySnapshotsRes.error || holdingsRes.error || tradesRes.error) {
        return null;
      }

      const overrideRow = overrideRes.data as PortfolioOverride | null;
      const defaultUsdRate = DEFAULT_USD_SGD_RATE;

      const holdingsRows = (holdingsRes.data ?? []) as Holding[];
      const holdings: HoldingInput[] = holdingsRows.map((h) =>
        mapHolding(h, defaultUsdRate)
      );

      const openTrades = (tradesRes.data ?? []) as OptionsTrade[];
      const dailyRows = (dailySnapshotsRes.data ?? []) as DailyPortfolioSnapshot[];
      const openPositionsCount = openTrades.length;
      const snapshots = buildSnapshotSummariesFromDailyRows(
        dailyRows,
        openPositionsCount
      );
      const latestDaily = dailyRows[0] ?? null;
      const latestSummary = snapshots[0] ?? null;

      const holdingsValueSgd = holdings.reduce((s, h) => s + h.market_value_sgd, 0);
      const recordedPortfolioValue = latestDaily
        ? Number(latestDaily.portfolio_value_sgd)
        : null;
      const portfolioValue = recordedPortfolioValue ?? holdingsValueSgd;

      const oldestSnapshotDate =
        dailyRows.length > 0
          ? dailyRows[dailyRows.length - 1]!.snapshot_date
          : latestDaily?.snapshot_date;

      return {
        portfolioValue,
        override: mapOverride(overrideRow),
        availableRiskCapacity: latestDaily
          ? Number(latestDaily.available_risk_capacity)
          : latestSummary?.availableRiskCapacity ?? 0,
        totalDeposits: null,
        totalWithdrawals: null,
        monthlyGainLoss: latestSummary?.mtdPnl ?? 0,
        optionsAllocationPct: estimateOptionsAllocationPct(holdings, portfolioValue),
        openPositionsCount,
        expiringThisWeek: countExpiringThisWeek(openTrades),
        inceptionDate: oldestSnapshotDate ?? new Date().toISOString().slice(0, 10),
        holdings,
        snapshots,
        openPositions: openTrades.map(mapOpenPosition),
      };
    },
    () => null
  );
}

function emptyPortfolioRaw(overrideRow: PortfolioOverride | null = null): PortfolioRawInput {
  return {
    portfolioValue: 0,
    override: mapOverride(overrideRow),
    availableRiskCapacity: 0,
    totalDeposits: null,
    totalWithdrawals: null,
    monthlyGainLoss: 0,
    optionsAllocationPct: 0,
    openPositionsCount: 0,
    expiringThisWeek: 0,
    inceptionDate: new Date().toISOString().slice(0, 10),
    holdings: [],
    snapshots: [],
    openPositions: [],
  };
}

async function withAssetTrackers(
  raw: PortfolioRawInput
): Promise<PortfolioRawInput> {
  const [cryptoRows, stockRows] = await Promise.all([
    getCryptoHoldingsRows(),
    getStockEtfHoldingsRows(),
  ]);
  let next = applyCryptoTrackerToPortfolioRaw(raw, cryptoRows);
  next = applyStockEtfTrackerToPortfolioRaw(next, stockRows);
  return next;
}

export async function getPortfolioDashboardData(): Promise<PortfolioMetrics> {
  const { value: raw, dataSource } = await readSupabasePrimary({
    module: "getPortfolioDashboardData",
    mock: async () => withAssetTrackers(getMockPortfolioRawWithHoldings()),
    empty: async () => withAssetTrackers(emptyPortfolioRaw()),
    read: async (userId) => {
      const fetched = await fetchRawFromSupabase(userId);
      return withAssetTrackers(fetched ?? emptyPortfolioRaw());
    },
  });
  return buildPortfolioMetrics(raw, dataSource);
}
