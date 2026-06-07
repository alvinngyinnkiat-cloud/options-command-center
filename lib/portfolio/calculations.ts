import type {
  AssetAllocationSlice,
  CalculatedPortfolioValues,
  HoldingInput,
  PortfolioMetrics,
  PortfolioOverrideInput,
  PortfolioRawInput,
  PortfolioValueComparison,
} from "./types";
import { calculateHealthScore } from "./health-score";

const ALLOCATION_COLORS = {
  stocks: "#3b82f6",
  etfs: "#22c55e",
  crypto: "#f59e0b",
  cash: "#94a3b8",
  options: "#a855f7",
} as const;

const CRYPTO_TICKERS = new Set(["BTC", "ETH", "SOL", "CRYPTO"]);

function isCryptoHolding(holding: HoldingInput): boolean {
  const ticker = holding.ticker.toUpperCase();
  return (
    holding.asset_type === "other" &&
    (CRYPTO_TICKERS.has(ticker) ||
      holding.ticker.toLowerCase().includes("crypto"))
  );
}

function isCashHolding(holding: HoldingInput): boolean {
  const ticker = holding.ticker.toUpperCase();
  return ticker === "CASH" || ticker.startsWith("CASH.");
}

export function classifyReconciliationBuckets(holdings: HoldingInput[]): {
  usStocksOptionsValueUsd: number;
  usStocksOptionsSgdEquivalent: number;
  cryptoValueSgd: number;
  sgStocksCashValueSgd: number;
  overallPortfolioValueSgd: number;
} {
  let usStocksOptionsValueUsd = 0;
  let usStocksOptionsSgdEquivalent = 0;
  let cryptoValueSgd = 0;
  let sgStocksCashValueSgd = 0;

  for (const holding of holdings) {
    if (isCryptoHolding(holding)) {
      cryptoValueSgd += holding.market_value_sgd;
      continue;
    }

    if (isCashHolding(holding)) {
      if (holding.currency === "USD") {
        usStocksOptionsValueUsd += holding.market_value_native;
        usStocksOptionsSgdEquivalent += holding.market_value_sgd;
      } else {
        sgStocksCashValueSgd += holding.market_value_sgd;
      }
      continue;
    }

    if (holding.currency === "USD") {
      usStocksOptionsValueUsd += holding.market_value_native;
      usStocksOptionsSgdEquivalent += holding.market_value_sgd;
    } else {
      sgStocksCashValueSgd += holding.market_value_sgd;
    }
  }

  return {
    usStocksOptionsValueUsd,
    usStocksOptionsSgdEquivalent,
    cryptoValueSgd,
    sgStocksCashValueSgd,
    overallPortfolioValueSgd:
      usStocksOptionsSgdEquivalent + cryptoValueSgd + sgStocksCashValueSgd,
  };
}

export function calculateNetContributions(
  totalDeposits: number | null,
  totalWithdrawals: number | null,
  holdings: HoldingInput[]
): { deposits: number; withdrawals: number; net: number } {
  if (totalDeposits != null && totalWithdrawals != null) {
    return {
      deposits: totalDeposits,
      withdrawals: totalWithdrawals,
      net: totalDeposits - totalWithdrawals,
    };
  }

  const net = holdings.reduce(
    (sum, h) => sum + (h.cost_basis ?? h.market_value_sgd),
    0
  );
  return { deposits: net, withdrawals: 0, net };
}

export function calculateNetProfitLoss(
  portfolioValue: number,
  netContributions: number
): number {
  return portfolioValue - netContributions;
}

export function calculateReturnPercent(
  netProfitLoss: number,
  netContributions: number
): number {
  if (netContributions <= 0) return 0;
  return (netProfitLoss / netContributions) * 100;
}

export function calculateAnnualizedReturn(
  currentValue: number,
  netContributions: number,
  inceptionDate: string,
  asOfDate?: string
): number {
  if (netContributions <= 0 || currentValue <= 0) return 0;

  const start = new Date(`${inceptionDate}T12:00:00`);
  const asOfMs = asOfDate
    ? new Date(`${asOfDate}T12:00:00`).getTime()
    : Date.now();
  const days = Math.max(
    1,
    (asOfMs - start.getTime()) / (1000 * 60 * 60 * 24)
  );
  const years = days / 365.25;
  if (years < 0.02) return 0;

  const growthMultiple = currentValue / netContributions;
  return (Math.pow(growthMultiple, 1 / years) - 1) * 100;
}

export function classifyHoldingsSgd(holdings: HoldingInput[]): {
  stocksValue: number;
  etfsValue: number;
  cryptoValue: number;
  cashValue: number;
  optionsValue: number;
  total: number;
} {
  let stocksValue = 0;
  let etfsValue = 0;
  let cryptoValue = 0;
  let cashValue = 0;
  let optionsValue = 0;

  for (const holding of holdings) {
    const value = holding.market_value_sgd;
    const ticker = holding.ticker.toUpperCase();

    if (ticker === "CASH" || ticker.startsWith("CASH.")) {
      cashValue += value;
      continue;
    }

    if (
      holding.asset_type === "other" &&
      (CRYPTO_TICKERS.has(ticker) ||
        holding.ticker.toLowerCase().includes("crypto"))
    ) {
      cryptoValue += value;
      continue;
    }

    switch (holding.asset_type) {
      case "stock":
        stocksValue += value;
        break;
      case "etf":
        etfsValue += value;
        break;
      case "option":
        optionsValue += value;
        break;
      case "other":
        cryptoValue += value;
        break;
    }
  }

  const total =
    stocksValue + etfsValue + cryptoValue + cashValue + optionsValue;

  return { stocksValue, etfsValue, cryptoValue, cashValue, optionsValue, total };
}

export function buildCalculatedValues(
  holdings: HoldingInput[],
  fallbackPortfolioValue?: number
): CalculatedPortfolioValues {
  const classified = classifyHoldingsSgd(holdings);
  const buckets = classifyReconciliationBuckets(holdings);
  const stocksOptionsValue =
    classified.stocksValue + classified.etfsValue + classified.optionsValue;
  return {
    portfolioValue:
      buckets.overallPortfolioValueSgd > 0
        ? buckets.overallPortfolioValueSgd
        : classified.total > 0
          ? classified.total
          : (fallbackPortfolioValue ?? 0),
    stocksValue: classified.stocksValue,
    etfsValue: classified.etfsValue,
    stocksOptionsValue,
    cryptoValue: classified.cryptoValue,
    cashValue: classified.cashValue,
    usStocksOptionsValueUsd: buckets.usStocksOptionsValueUsd,
    usStocksOptionsSgdEquivalent: buckets.usStocksOptionsSgdEquivalent,
    sgStocksCashValueSgd: buckets.sgStocksCashValueSgd,
  };
}

function resolveManualOverallSgd(
  override: PortfolioOverrideInput,
  calculated: CalculatedPortfolioValues
): number {
  const usSgd =
    override.manualUsStocksOptionsSgdEquivalent ??
    calculated.usStocksOptionsSgdEquivalent;
  const crypto = override.manualCryptoValueSgd ?? calculated.cryptoValue;
  const sg =
    override.manualSgStocksCashValueSgd ?? calculated.sgStocksCashValueSgd;
  return usSgd + crypto + sg;
}

function buildDraftComparison(
  override: PortfolioOverrideInput | null,
  calculated: CalculatedPortfolioValues,
  useManualOverride: boolean
): PortfolioValueComparison {
  const calculatedOverall = calculated.portfolioValue;
  const overall =
    override != null ? resolveManualOverallSgd(override, calculated) : null;

  return {
    overallPortfolioValueSgd: overall,
    calculatedOverallPortfolioValueSgd: calculatedOverall,
    differenceSgd:
      overall != null ? overall - calculatedOverall : null,
    manualUsStocksOptionsValueUsd:
      override?.manualUsStocksOptionsValueUsd ?? null,
    manualUsStocksOptionsSgdEquivalent:
      override?.manualUsStocksOptionsSgdEquivalent ?? null,
    manualCryptoValueSgd: override?.manualCryptoValueSgd ?? null,
    manualSgStocksCashValueSgd: override?.manualSgStocksCashValueSgd ?? null,
    calculatedUsStocksOptionsValueUsd: calculated.usStocksOptionsValueUsd,
    calculatedUsStocksOptionsSgdEquivalent:
      calculated.usStocksOptionsSgdEquivalent,
    calculatedCryptoValueSgd: calculated.cryptoValue,
    calculatedSgStocksCashValueSgd: calculated.sgStocksCashValueSgd,
    useManualOverride,
  };
}

export function applyManualOverride(
  calculated: CalculatedPortfolioValues,
  override: PortfolioOverrideInput | null
): {
  display: CalculatedPortfolioValues;
  comparison: PortfolioValueComparison;
} {
  const hasManualInputs =
    override?.manualUsStocksOptionsValueUsd != null ||
    override?.manualUsStocksOptionsSgdEquivalent != null ||
    override?.manualCryptoValueSgd != null ||
    override?.manualSgStocksCashValueSgd != null;

  if (!override?.useManualOverride || !hasManualInputs) {
    return {
      display: calculated,
      comparison: buildDraftComparison(
        override,
        calculated,
        false
      ),
    };
  }

  const usUsd =
    override.manualUsStocksOptionsValueUsd ??
    calculated.usStocksOptionsValueUsd;
  const usSgd =
    override.manualUsStocksOptionsSgdEquivalent ??
    calculated.usStocksOptionsSgdEquivalent;
  const manualCrypto =
    override.manualCryptoValueSgd ?? calculated.cryptoValue;
  const manualSg =
    override.manualSgStocksCashValueSgd ?? calculated.sgStocksCashValueSgd;
  const portfolioValue = usSgd + manualCrypto + manualSg;

  return {
    display: {
      portfolioValue,
      stocksValue: usSgd + manualSg,
      etfsValue: 0,
      stocksOptionsValue: usSgd + manualSg,
      cryptoValue: manualCrypto,
      cashValue: 0,
      usStocksOptionsValueUsd: usUsd,
      usStocksOptionsSgdEquivalent: usSgd,
      sgStocksCashValueSgd: manualSg,
    },
    comparison: {
      overallPortfolioValueSgd: portfolioValue,
      calculatedOverallPortfolioValueSgd: calculated.portfolioValue,
      differenceSgd: portfolioValue - calculated.portfolioValue,
      manualUsStocksOptionsValueUsd: override.manualUsStocksOptionsValueUsd,
      manualUsStocksOptionsSgdEquivalent:
        override.manualUsStocksOptionsSgdEquivalent,
      manualCryptoValueSgd: override.manualCryptoValueSgd,
      manualSgStocksCashValueSgd: override.manualSgStocksCashValueSgd,
      calculatedUsStocksOptionsValueUsd: calculated.usStocksOptionsValueUsd,
      calculatedUsStocksOptionsSgdEquivalent:
        calculated.usStocksOptionsSgdEquivalent,
      calculatedCryptoValueSgd: calculated.cryptoValue,
      calculatedSgStocksCashValueSgd: calculated.sgStocksCashValueSgd,
      useManualOverride: true,
    },
  };
}

export function buildAssetAllocation(
  stocksValue: number,
  etfsValue: number,
  cryptoValue: number,
  cashValue: number,
  optionsValue: number,
  portfolioValue: number
): AssetAllocationSlice[] {
  const slices = [
    { name: "Stocks", value: stocksValue, color: ALLOCATION_COLORS.stocks },
    { name: "ETFs", value: etfsValue, color: ALLOCATION_COLORS.etfs },
    { name: "Crypto", value: cryptoValue, color: ALLOCATION_COLORS.crypto },
    { name: "Cash", value: cashValue, color: ALLOCATION_COLORS.cash },
    { name: "Options", value: optionsValue, color: ALLOCATION_COLORS.options },
  ].filter((s) => s.value > 0);

  const total =
    portfolioValue > 0 ? portfolioValue : slices.reduce((a, b) => a + b.value, 0);

  return slices.map((slice) => ({
    ...slice,
    percent: total > 0 ? (slice.value / total) * 100 : 0,
  }));
}

export function buildPortfolioMetrics(
  raw: PortfolioRawInput,
  dataSource: "supabase" | "mock"
): PortfolioMetrics {
  const { deposits, withdrawals, net: netContributions } =
    calculateNetContributions(
      raw.totalDeposits,
      raw.totalWithdrawals,
      raw.holdings
    );

  const classified = classifyHoldingsSgd(raw.holdings);
  const calculated = buildCalculatedValues(raw.holdings, raw.portfolioValue);
  const { display, comparison } = applyManualOverride(
    calculated,
    raw.override
  );

  const portfolioValue = display.portfolioValue;
  const netProfitLoss = calculateNetProfitLoss(portfolioValue, netContributions);
  const returnPercent = calculateReturnPercent(netProfitLoss, netContributions);
  const annualizedReturnPercent = calculateAnnualizedReturn(
    portfolioValue,
    netContributions,
    raw.inceptionDate,
    raw.asOfDate
  );

  const healthScore = calculateHealthScore({
    portfolioValue,
    availableRiskCapacity: raw.availableRiskCapacity,
    optionsAllocationPct: raw.optionsAllocationPct,
    openPositionsCount: raw.openPositionsCount,
    expiringThisWeek: raw.expiringThisWeek,
    returnPercent,
  });

  const assetAllocation = buildAssetAllocation(
    display.stocksValue,
    display.etfsValue,
    display.cryptoValue,
    display.cashValue,
    classified.optionsValue,
    portfolioValue
  );

  return {
    portfolioValue,
    myPortfolioValue: portfolioValue,
    tradingCapital: portfolioValue,
    cryptoCapital: display.cryptoValue,
    tradingCashSgd: display.cashValue,
    cryptoCashSgd: 0,
    totalCashSgd: display.cashValue,
    usStocksOptionsValueUsd: display.usStocksOptionsValueUsd,
    stocksValue: display.stocksValue,
    etfsValue: display.etfsValue,
    cryptoValue: display.cryptoValue,
    cashValue: display.cashValue,
    calculated,
    comparison,
    override: raw.override,
    holdings: raw.holdings,
    totalDeposits: deposits,
    totalWithdrawals: withdrawals,
    netContributions,
    netProfitLoss,
    returnPercent,
    monthlyGainLoss: raw.monthlyGainLoss,
    annualizedReturnPercent,
    availableRiskCapacity: raw.availableRiskCapacity,
    healthScore,
    assetAllocation,
    openPositions: raw.openPositions,
    snapshots: raw.snapshots,
    dataSource,
  };
}
