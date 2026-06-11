import { DEFAULT_USD_SGD_RATE } from "@/lib/portfolio/currency";
import { MOCK_REFERENCE_DATE } from "@/lib/mock/reference-dates";
import type { PortfolioOverrideInput, PortfolioRawInput } from "@/lib/portfolio/types";

export const MOCK_PORTFOLIO_OVERRIDE: PortfolioOverrideInput = {
  useManualOverride: false,
  manualUsStocksOptionsValueUsd: null,
  manualUsStocksOptionsSgdEquivalent: null,
  manualCryptoValueSgd: null,
  manualSgStocksCashValueSgd: null,
  manualSgStocksValueSgd: null,
  manualSgCashValueSgd: null,
  manualTradingCashUsd: 0,
  manualTradingCashSgd: 0,
  manualCryptoCashSgd: 0,
  manualCryptoHoldingsSgd: null,
  manualCryptoContributionsSgd: null,
  manualClientPortfolioSgd: 0,
  manualUsdSgdRate: DEFAULT_USD_SGD_RATE,
  manualTotalPortfolioValueSgd: null,
  overrideReason: null,
  overrideUpdatedAt: null,
};

export const MOCK_PORTFOLIO_RAW: PortfolioRawInput = {
  portfolioValue: 0,
  override: MOCK_PORTFOLIO_OVERRIDE,
  availableRiskCapacity: 0,
  totalDeposits: 0,
  totalWithdrawals: 0,
  monthlyGainLoss: 0,
  optionsAllocationPct: 0,
  openPositionsCount: 0,
  expiringThisWeek: 0,
  inceptionDate: MOCK_REFERENCE_DATE,
  asOfDate: MOCK_REFERENCE_DATE,
  holdings: [],
  snapshots: [],
  openPositions: [],
};

export const MOCK_EQUITY_CURVE: { date: string; value: number }[] = [];
