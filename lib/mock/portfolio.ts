import { DEFAULT_USD_SGD_RATE } from "@/lib/portfolio/currency";
import { calculateMarketValueSgd } from "@/lib/portfolio/currency";
import { MOCK_REFERENCE_DATE } from "@/lib/mock/reference-dates";
import type { HoldingInput, PortfolioOverrideInput, PortfolioRawInput } from "@/lib/portfolio/types";
import type { AssetType, CurrencyCode } from "@/types/database";

function holding(
  ticker: string,
  asset_type: AssetType,
  native: number,
  currency: CurrencyCode,
  fxRate: number = DEFAULT_USD_SGD_RATE,
  cost_basis: number | null = null
): HoldingInput {
  const market_value_sgd = calculateMarketValueSgd(native, currency, fxRate);
  return {
    ticker,
    asset_type,
    currency,
    market_value_native: native,
    fx_rate_to_sgd: currency === "SGD" ? 1 : fxRate,
    market_value_sgd,
    market_value: market_value_sgd,
    cost_basis,
  };
}

export const MOCK_PORTFOLIO_OVERRIDE: PortfolioOverrideInput = {
  useManualOverride: false,
  manualUsStocksOptionsValueUsd: null,
  manualUsStocksOptionsSgdEquivalent: null,
  manualCryptoValueSgd: null,
  manualSgStocksCashValueSgd: null,
  manualTradingCashUsd: 18_000,
  manualTradingCashSgd: 24_336,
  manualUsdSgdRate: DEFAULT_USD_SGD_RATE,
  manualTotalPortfolioValueSgd: null,
  overrideReason: null,
  overrideUpdatedAt: null,
};

export const MOCK_PORTFOLIO_RAW: PortfolioRawInput = {
  portfolioValue: 0,
  override: MOCK_PORTFOLIO_OVERRIDE,
  availableRiskCapacity: 142_260,
  totalDeposits: 250_000,
  totalWithdrawals: 15_000,
  monthlyGainLoss: 4_820,
  optionsAllocationPct: 50,
  openPositionsCount: 12,
  expiringThisWeek: 3,
  inceptionDate: "2024-01-15",
  asOfDate: MOCK_REFERENCE_DATE,
  holdings: [
    holding("AAPL", "stock", 42_500, "USD", 1.352, 38_000),
    holding("MSFT", "stock", 38_200, "USD", 1.352, 35_000),
    holding("NVDA", "stock", 44_300, "USD", 1.352, 28_000),
    holding("D05", "stock", 28_400, "SGD", 1, 26_000),
    holding("O39", "stock", 15_600, "SGD", 1, 14_200),
    holding("SPY", "etf", 52_000, "USD", 1.352, 48_000),
    holding("ES3", "etf", 22_000, "SGD", 1, 20_500),
    holding("GLD", "etf", 15_000, "USD", 1.352, 14_500),
    holding("BTC", "other", 8_520, "USD", 1.352, 7_000),
    holding("ETH", "other", 4_000, "USD", 1.352, 3_200),
    holding("CASH", "other", 12_000, "SGD", 1, 12_000),
    holding("CASH.USD", "other", 18_000, "USD", 1.352, 18_000),
    holding("SPY", "option", 12_000, "USD", 1.352, 10_000),
    holding("QQQ", "option", 8_500, "USD", 1.352, 7_500),
    holding("IWM", "option", 6_500, "USD", 1.352, 6_000),
    holding("AAPL", "option", 12_000, "USD", 1.352, 11_000),
  ],
  snapshots: [
    {
      id: "snap-1",
      snapshotDate: "2026-06-06",
      portfolioValue: 384_120,
      availableRiskCapacity: 142_260,
      mtdPnl: 4_820,
      mtdPnlPct: 1.7,
      openPositionsCount: 12,
      healthScore: 78,
    },
    {
      id: "snap-2",
      snapshotDate: "2026-05-30",
      portfolioValue: 379_300,
      availableRiskCapacity: 145_000,
      mtdPnl: 2_100,
      mtdPnlPct: 0.8,
      openPositionsCount: 11,
      healthScore: 76,
    },
    {
      id: "snap-3",
      snapshotDate: "2026-05-23",
      portfolioValue: 377_200,
      availableRiskCapacity: 148_500,
      mtdPnl: -1_200,
      mtdPnlPct: -0.4,
      openPositionsCount: 10,
      healthScore: 74,
    },
    {
      id: "snap-4",
      snapshotDate: "2026-05-16",
      portfolioValue: 378_400,
      availableRiskCapacity: 150_200,
      mtdPnl: 900,
      mtdPnlPct: 0.3,
      openPositionsCount: 10,
      healthScore: 75,
    },
  ],
  openPositions: [
    {
      id: "trade-1",
      symbol: "SPY",
      strategy: "Iron Condor",
      dte: 18,
      pnl: 420,
      totalTradePnl: 420,
      clientPnl: 0,
      pnlPercent: 42,
      status: "open",
      isClientTrade: false,
    },
    {
      id: "trade-2",
      symbol: "QQQ",
      strategy: "Bull Put Spread",
      dte: 25,
      pnl: 185,
      totalTradePnl: 185,
      clientPnl: 0,
      pnlPercent: 61,
      status: "open",
      isClientTrade: false,
    },
    {
      id: "trade-3",
      symbol: "IWM",
      strategy: "Bear Call Spread",
      dte: 11,
      pnl: -95,
      totalTradePnl: -95,
      clientPnl: 0,
      pnlPercent: -12,
      status: "open",
      isClientTrade: false,
    },
    {
      id: "trade-4",
      symbol: "AAPL",
      strategy: "Bull Put Spread",
      dte: 32,
      pnl: 310,
      totalTradePnl: 310,
      clientPnl: 0,
      pnlPercent: 78,
      status: "closing",
      isClientTrade: false,
    },
  ],
};

// Set portfolioValue from holdings sum after definition
MOCK_PORTFOLIO_RAW.portfolioValue = MOCK_PORTFOLIO_RAW.holdings.reduce(
  (s, h) => s + h.market_value_sgd,
  0
);

export const MOCK_EQUITY_CURVE = [
  { date: "Jan", value: 358_000 },
  { date: "Feb", value: 362_500 },
  { date: "Mar", value: 368_200 },
  { date: "Apr", value: 371_800 },
  { date: "May", value: 377_200 },
  { date: "Jun", value: 384_120 },
];

