import type {
  AssetType,
  CurrencyCode,
  StrategyType,
  TradeStatus,
} from "@/types/database";

export type DataSource = "supabase" | "mock";

export type HealthFactorStatus = "good" | "warn" | "neutral" | "bad";

export interface HoldingInput {
  ticker: string;
  asset_type: AssetType;
  currency: CurrencyCode;
  market_value_native: number;
  fx_rate_to_sgd: number;
  market_value_sgd: number;
  /** @deprecated Use market_value_sgd — kept for net contributions fallback */
  market_value: number;
  cost_basis: number | null;
}

export interface PortfolioOverrideInput {
  useManualOverride: boolean;
  /** US stocks, ETFs, options, and USD cash — broker value in native USD */
  manualUsStocksOptionsValueUsd: number | null;
  /** Broker-reported SGD equivalent for US bucket — entered manually, not FX-derived */
  manualUsStocksOptionsSgdEquivalent: number | null;
  manualCryptoValueSgd: number | null;
  /** @deprecated Legacy combined SG — use manualSgStocksValueSgd + manualSgCashValueSgd */
  manualSgStocksCashValueSgd: number | null;
  /** Singapore stocks and ETFs (SGD) */
  manualSgStocksValueSgd: number | null;
  /** Singapore broker cash (SGD) — separate from Trading Cash SGD */
  manualSgCashValueSgd: number | null;
  /** Manual broker USD cash — reference only for US trading */
  manualTradingCashUsd: number | null;
  /** Manual broker SGD cash — used for Trading Cash SGD and trading capital */
  manualTradingCashSgd: number | null;
  /** Manual exchange fiat cash on crypto exchange (SGD) — not stablecoins */
  manualCryptoCashSgd: number;
  /** Auto-synced sum of individual crypto holdings — not manually entered */
  manualCryptoHoldingsSgd: number | null;
  /** Total crypto contributions / cost (SGD) for portfolio-level P/L */
  manualCryptoContributionsSgd: number | null;
  /** Manual client-owned portfolio slice (SGD) — Phase 17A ownership split */
  manualClientPortfolioSgd: number;
  /** Legacy — not exposed in reconciliation UI; default FX for holdings load */
  manualUsdSgdRate: number;
  /** Legacy — derived on save from reconciled SGD buckets */
  manualTotalPortfolioValueSgd: number | null;
  overrideReason: string | null;
  overrideUpdatedAt: string | null;
}

export interface PortfolioValueComparison {
  overallPortfolioValueSgd: number | null;
  calculatedOverallPortfolioValueSgd: number;
  differenceSgd: number | null;
  manualUsStocksOptionsValueUsd: number | null;
  manualUsStocksOptionsSgdEquivalent: number | null;
  manualCryptoValueSgd: number | null;
  manualSgStocksCashValueSgd: number | null;
  calculatedUsStocksOptionsValueUsd: number;
  calculatedUsStocksOptionsSgdEquivalent: number;
  calculatedCryptoValueSgd: number;
  calculatedSgStocksCashValueSgd: number;
  useManualOverride: boolean;
}

export interface CalculatedPortfolioValues {
  portfolioValue: number;
  stocksValue: number;
  etfsValue: number;
  stocksOptionsValue: number;
  cryptoValue: number;
  cashValue: number;
  usStocksOptionsValueUsd: number;
  usStocksOptionsSgdEquivalent: number;
  sgStocksCashValueSgd: number;
}

export interface PortfolioRawInput {
  portfolioValue: number;
  override: PortfolioOverrideInput | null;
  availableRiskCapacity: number;
  totalDeposits: number | null;
  totalWithdrawals: number | null;
  monthlyGainLoss: number;
  optionsAllocationPct: number;
  openPositionsCount: number;
  expiringThisWeek: number;
  inceptionDate: string;
  /** Stable "today" for return calculations — avoids Date.now() hydration drift in mock/SSR. */
  asOfDate?: string;
  holdings: HoldingInput[];
  snapshots: PortfolioSnapshotSummary[];
  openPositions: OpenPositionSummary[];
}

export interface PortfolioSnapshotSummary {
  id: string;
  snapshotDate: string;
  portfolioValue: number;
  availableRiskCapacity: number;
  mtdPnl: number;
  mtdPnlPct: number;
  openPositionsCount: number;
  healthScore: number | null;
}

export interface OpenPositionSummary {
  id: string;
  symbol: string;
  strategy: string;
  dte: number;
  /** My share of P/L — personal performance only */
  pnl: number;
  totalTradePnl: number;
  clientPnl: number;
  pnlPercent: number;
  status: TradeStatus;
  isClientTrade: boolean;
}

export interface AssetAllocationSlice {
  name: string;
  value: number;
  percent: number;
  color: string;
}

export interface HealthFactor {
  label: string;
  value: string;
  status: HealthFactorStatus;
  weight: number;
}

export interface HealthScoreResult {
  score: number;
  maxScore: number;
  status: string;
  factors: HealthFactor[];
  explanation: string;
  suggestions: string[];
}

export interface PortfolioMetrics {
  /** Active display values (SGD) — manual if override enabled */
  portfolioValue: number;
  /** Personal portfolio slice (SGD) = total portfolio − client portfolio */
  myPortfolioValue: number;
  tradingCapital: number;
  cryptoPortfolioValueSgd: number;
  /** @deprecated Use cryptoPortfolioValueSgd */
  cryptoCapital: number;
  tradingCashSgd: number;
  cryptoCashSgd: number;
  totalCashSgd: number;
  /** US stocks, ETFs, options, and USD cash — native USD for US trading reference */
  usStocksOptionsValueUsd: number;
  stocksValue: number;
  etfsValue: number;
  cryptoValue: number;
  cashValue: number;
  calculated: CalculatedPortfolioValues;
  comparison: PortfolioValueComparison;
  override: PortfolioOverrideInput | null;
  holdings: HoldingInput[];
  totalDeposits: number;
  totalWithdrawals: number;
  netContributions: number;
  netProfitLoss: number;
  returnPercent: number;
  monthlyGainLoss: number;
  annualizedReturnPercent: number;
  availableRiskCapacity: number;
  healthScore: HealthScoreResult;
  assetAllocation: AssetAllocationSlice[];
  openPositions: OpenPositionSummary[];
  snapshots: PortfolioSnapshotSummary[];
  dataSource: DataSource;
}

export interface PortfolioDashboardData {
  metrics: PortfolioMetrics;
}

export const STRATEGY_LABELS: Record<StrategyType, string> = {
  bull_put_spread: "Bull Put Spread",
  bear_call_spread: "Bear Call Spread",
  iron_condor: "Iron Condor",
  sell_put: "Sell Put",
  sell_call: "Sell Call",
  leaps: "LEAPS",
  vertical_call_spread: "Vertical Call Spread",
};
