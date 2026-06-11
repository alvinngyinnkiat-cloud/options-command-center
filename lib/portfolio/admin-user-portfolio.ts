import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import { buildClientProfitSharingData } from "@/lib/client-profit-sharing/page-data";
import { buildPortfolioMetrics } from "@/lib/portfolio/calculations";
import {
  buildCapitalPoolsBreakdown,
  manualTradingCashFromOverride,
  type CapitalPoolsBreakdown,
} from "@/lib/portfolio/capital-pools";
import { applyCryptoTrackerToPortfolioRaw } from "@/lib/portfolio/crypto-integration";
import {
  calculateMarketValueSgd,
  DEFAULT_USD_SGD_RATE,
  resolveFxRateToSgd,
} from "@/lib/portfolio/currency";
import { applyStockEtfTrackerToPortfolioRaw } from "@/lib/portfolio/stock-etf-integration";
import type {
  HoldingInput,
  OpenPositionSummary,
  PortfolioMetrics,
  PortfolioOverrideInput,
  PortfolioRawInput,
} from "@/lib/portfolio/types";
import { STRATEGY_LABELS } from "@/lib/portfolio/types";
import { buildCategoryValuesSgd } from "@/lib/stocks-etfs/build-tab-data";
import { enrichAllStockEtfHoldings } from "@/lib/stocks-etfs/map-holding";
import { calculatePnLFromOptionsRow } from "@/lib/trades/pnl-allocation";
import { enrichTrade } from "@/lib/trades/map-trade";
import type { EnrichedTrade } from "@/lib/trades/types";
import type { Database } from "@/types/database";
import type {
  AssetType,
  CurrencyCode,
  Holding,
  OptionsTrade,
  PortfolioOverride,
} from "@/types/database";

type AdminClient = SupabaseClient<Database>;

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

function emptyPortfolioRaw(
  overrideRow: PortfolioOverride | null = null
): PortfolioRawInput {
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

async function fetchPortfolioRawForUser(
  admin: AdminClient,
  userId: string
): Promise<PortfolioRawInput> {
  const [holdingsRes, tradesRes, overrideRes] = await Promise.all([
    admin.from("holdings").select("*").eq("user_id", userId).is("snapshot_id", null),
    admin
      .from("options_trades")
      .select("*")
      .eq("user_id", userId)
      .in("status", ["open", "closing", "managed"]),
    admin
      .from("portfolio_overrides")
      .select("*")
      .eq("user_id", userId)
      .maybeSingle(),
  ]);

  if (holdingsRes.error || tradesRes.error) {
    return emptyPortfolioRaw(
      (overrideRes.data as PortfolioOverride | null) ?? null
    );
  }

  const overrideRow = overrideRes.data as PortfolioOverride | null;
  const defaultUsdRate = DEFAULT_USD_SGD_RATE;
  const holdingsRows = (holdingsRes.data ?? []) as Holding[];
  const holdings = holdingsRows.map((h) => mapHolding(h, defaultUsdRate));
  const openTrades = (tradesRes.data ?? []) as OptionsTrade[];
  const holdingsValueSgd = holdings.reduce((s, h) => s + h.market_value_sgd, 0);

  return {
    portfolioValue: holdingsValueSgd,
    override: mapOverride(overrideRow),
    availableRiskCapacity: 0,
    totalDeposits: null,
    totalWithdrawals: null,
    monthlyGainLoss: 0,
    optionsAllocationPct: 0,
    openPositionsCount: openTrades.length,
    expiringThisWeek: 0,
    inceptionDate: new Date().toISOString().slice(0, 10),
    holdings,
    snapshots: [],
    openPositions: openTrades.map(mapOpenPosition),
  };
}

async function withAssetTrackersForUser(
  admin: AdminClient,
  userId: string,
  raw: PortfolioRawInput
): Promise<PortfolioRawInput> {
  const [cryptoRes, stockRes] = await Promise.all([
    admin.from("crypto_holdings").select("*").eq("user_id", userId),
    admin.from("stock_etf_holdings").select("*").eq("user_id", userId),
  ]);

  let next = applyCryptoTrackerToPortfolioRaw(
    raw,
    (cryptoRes.data ?? []) as import("@/types/database").CryptoHolding[]
  );
  next = applyStockEtfTrackerToPortfolioRaw(
    next,
    (stockRes.data ?? []) as import("@/types/database").StockEtfHolding[]
  );
  return next;
}

function getOpenTrades(trades: EnrichedTrade[]): EnrichedTrade[] {
  return trades.filter(
    (t) =>
      t.status === "open" ||
      t.status === "managed" ||
      t.status === "closing"
  );
}

async function buildCapitalPoolsForUser(
  admin: AdminClient,
  userId: string,
  metrics: PortfolioMetrics
): Promise<CapitalPoolsBreakdown> {
  const [cryptoRes, stockRes, tradesRes, clientsRes, allocRes] =
    await Promise.all([
      admin.from("crypto_holdings").select("*").eq("user_id", userId),
      admin.from("stock_etf_holdings").select("*").eq("user_id", userId),
      admin.from("options_trades").select("*").eq("user_id", userId),
      admin.from("client_profiles").select("*").eq("user_id", userId),
      admin
        .from("client_trade_allocations")
        .select("*")
        .eq("user_id", userId),
    ]);

  const stockRows = (stockRes.data ??
    []) as import("@/types/database").StockEtfHolding[];
  const categories = buildCategoryValuesSgd(
    enrichAllStockEtfHoldings(stockRows, new Map())
  );
  const tradeRows = (tradesRes.data ?? []) as OptionsTrade[];
  const enrichedTrades = tradeRows.map((row) => enrichTrade(row, {}));
  const clientData = buildClientProfitSharingData({
    clients: (clientsRes.data ??
      []) as import("@/types/database").ClientProfileRecord[],
    allocations: (allocRes.data ??
      []) as import("@/types/database").ClientTradeAllocation[],
    trades: enrichedTrades,
    dataSource: "supabase",
  });

  return buildCapitalPoolsBreakdown({
    holdings: metrics.holdings,
    cryptoRows: (cryptoRes.data ??
      []) as import("@/types/database").CryptoHolding[],
    usEtfValueSgd: categories.usEtfValueSgd,
    usStockValueSgd: categories.usStockValueSgd,
    sgStockValueSgd: categories.sgStockValueSgd,
    openTrades: getOpenTrades(enrichedTrades),
    clientSummary: clientData.summary,
    tradeAllocations: clientData.tradeAllocations,
    manualTradingCash: manualTradingCashFromOverride(metrics.override),
    portfolioOverride: metrics.override,
  });
}

export async function getEnrichedPortfolioMetricsForUser(
  admin: AdminClient,
  userId: string
): Promise<{ metrics: PortfolioMetrics; capitalPools: CapitalPoolsBreakdown }> {
  const raw = await withAssetTrackersForUser(
    admin,
    userId,
    await fetchPortfolioRawForUser(admin, userId)
  );
  const metrics = buildPortfolioMetrics(raw, "supabase");
  const capitalPools = await buildCapitalPoolsForUser(admin, userId, metrics);
  return { metrics, capitalPools };
}

export async function fetchAllTimeContributionsForUser(
  admin: AdminClient,
  userId: string
): Promise<number> {
  const { data, error } = await admin
    .from("monthly_contributions")
    .select("stock_options_amount_sgd, crypto_amount_sgd")
    .eq("user_id", userId);

  if (error) throw new Error(error.message);

  return (data ?? []).reduce((sum, row) => {
    const r = row as {
      stock_options_amount_sgd: number;
      crypto_amount_sgd: number;
    };
    return (
      sum +
      Number(r.stock_options_amount_sgd ?? 0) +
      Number(r.crypto_amount_sgd ?? 0)
    );
  }, 0);
}
