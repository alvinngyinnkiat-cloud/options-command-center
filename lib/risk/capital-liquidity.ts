import type { HoldingInput } from "@/lib/portfolio/types";
import type { EnrichedTrade } from "@/lib/trades/types";
import type { RiskZone } from "./constants";
import { buildRiskFramework } from "./calculations";

export type StressTestStatus = "comfortable" | "tight" | "underfunded";

export interface CashBalances {
  cashSgd: number;
  cashUsdNative: number;
  cashUsdSgd: number;
  /** Trading cash only — broker USD + SGD (excludes crypto cash) */
  cashAvailable: number;
  tradingCashSgd: number;
  cryptoCashSgd: number;
}

export function calculateUsdTradingBuyingPower(
  cashUsdNative: number,
  currentOpenRisk: number
): number {
  return cashUsdNative - currentOpenRisk;
}

export interface CapitalLiquidityBase {
  /** My portfolio value (trading + crypto capital) */
  portfolioValue: number;
  /** Trading capital — excludes crypto and client capital */
  tradingCapital: number;
  /** US stocks, ETFs, options, and USD cash — native USD for US trading capacity */
  usStocksOptionsValueUsd: number;
  stocksEtfValue: number;
  cryptoValue: number;
  cash: CashBalances;
  /** US Stocks & Options Value (USD) − Current Open Risk */
  usdTradingBuyingPower: number;
  currentOpenRisk: number;
  currentPositionMarketValue: number;
  currentPositionCloseRequirement: number;
  openTradesCount: number;
  maximumOptionsCapital: number;
  availableRiskCapacity: number;
  maximumRiskPerTrade: number;
}

export interface CapitalLiquidityResult extends CapitalLiquidityBase {
  newTradeRisk: number;
  stockDeployableCapital: number;
  remainingCapitalAfterNewTrade: number;
  liquidityRatio: number;
  emergencyBuffer: number;
  afterNewTradeBuffer: number;
  capitalUtilizationPct: number;
  tradeEligible: boolean;
  canCloseAllPositions: boolean;
  finalStatus: RiskZone;
  stressTest: {
    cashAvailable: number;
    currentCloseRequirement: number;
    worstCaseOpenRisk: number;
    remainingCashAfterWorstCase: number;
    status: StressTestStatus;
  };
}

export function extractCashBalances(
  holdings: HoldingInput[],
  cryptoCashSgd = 0
): CashBalances {
  const sgdCashHolding = holdings.find(
    (h) => h.ticker.toUpperCase() === "CASH" && h.currency === "SGD"
  );
  const usdCashHolding = holdings.find((h) =>
    h.ticker.toUpperCase().startsWith("CASH.")
  );

  const cashSgd = sgdCashHolding?.market_value_sgd ?? 0;
  const cashUsdNative = usdCashHolding?.market_value_native ?? 0;
  const cashUsdSgd = usdCashHolding?.market_value_sgd ?? 0;
  const tradingCashSgd = cashSgd + cashUsdSgd;

  return {
    cashSgd,
    cashUsdNative,
    cashUsdSgd,
    cashAvailable: tradingCashSgd,
    tradingCashSgd,
    cryptoCashSgd,
  };
}

export function sumPositionMarketValues(openTrades: EnrichedTrade[]): number {
  return openTrades.reduce(
    (s, t) => s + t.calculations.currentCloseCost,
    0
  );
}

export function calculateStockDeployableCapital(
  stocksEtfValue: number,
  currentOpenRisk: number
): number {
  return stocksEtfValue - currentOpenRisk;
}

export function calculateLiquidityRatio(
  cashAvailable: number,
  closeRequirement: number
): number {
  if (closeRequirement <= 0) return cashAvailable > 0 ? Infinity : 0;
  return cashAvailable / closeRequirement;
}

export function calculateCapitalUtilizationPct(
  currentOpenRisk: number,
  newTradeRisk: number,
  stocksEtfValue: number
): number {
  if (stocksEtfValue <= 0) return 0;
  return ((currentOpenRisk + newTradeRisk) / stocksEtfValue) * 100;
}

export function getCapitalLiquidityStatus(input: {
  liquidityRatio: number;
  emergencyBuffer: number;
  capitalUtilizationPct: number;
}): RiskZone {
  const danger =
    input.liquidityRatio < 1 ||
    input.emergencyBuffer < 0 ||
    input.capitalUtilizationPct > 75;

  if (danger) return "danger";

  const caution =
    (input.liquidityRatio >= 1 && input.liquidityRatio <= 2) ||
    (input.capitalUtilizationPct >= 60 && input.capitalUtilizationPct <= 75);

  if (caution) return "caution";

  const safe =
    input.liquidityRatio > 2 &&
    input.emergencyBuffer > 0 &&
    input.capitalUtilizationPct < 60;

  if (safe) return "safe";

  return "caution";
}

export function getStressTestStatus(
  remainingCashAfterWorstCase: number,
  liquidityRatio: number
): StressTestStatus {
  if (remainingCashAfterWorstCase < 0 || liquidityRatio < 1) {
    return "underfunded";
  }
  if (liquidityRatio > 2 && remainingCashAfterWorstCase > 0) {
    return "comfortable";
  }
  return "tight";
}

export function buildCapitalLiquidityBase(input: {
  portfolioValue: number;
  tradingCapital?: number;
  tradingCashSgd?: number;
  usStocksOptionsValueUsd: number;
  stocksValue: number;
  etfsValue: number;
  cryptoValue: number;
  cryptoCashSgd?: number;
  holdings: HoldingInput[];
  openTrades: EnrichedTrade[];
  maxAllocationPct?: number;
  maxRiskPerTradePct?: number;
}): CapitalLiquidityBase {
  const openTrades = input.openTrades.filter(
    (t) =>
      t.status === "open" ||
      t.status === "managed" ||
      t.status === "closing"
  );
  const currentOpenRisk = openTrades.reduce(
    (s, t) => s + t.calculations.maxRisk,
    0
  );
  const currentPositionMarketValue = sumPositionMarketValues(openTrades);
  const tradingCapital = input.tradingCapital ?? input.portfolioValue;
  const framework = buildRiskFramework({
    portfolioValue: tradingCapital,
    currentOpenRisk,
    maxAllocationPct: input.maxAllocationPct,
    maxRiskPerTradePct: input.maxRiskPerTradePct,
  });

  const extracted = extractCashBalances(
    input.holdings,
    input.cryptoCashSgd ?? 0
  );
  const tradingCashSgd = input.tradingCashSgd ?? extracted.tradingCashSgd;
  const cash: CashBalances = {
    ...extracted,
    tradingCashSgd,
    cashAvailable: tradingCashSgd,
    cryptoCashSgd: input.cryptoCashSgd ?? extracted.cryptoCashSgd,
  };
  const usStocksOptionsValueUsd = input.usStocksOptionsValueUsd;

  return {
    portfolioValue: input.portfolioValue,
    tradingCapital,
    usStocksOptionsValueUsd,
    stocksEtfValue: usStocksOptionsValueUsd,
    cryptoValue: input.cryptoValue,
    cash,
    usdTradingBuyingPower: calculateUsdTradingBuyingPower(
      usStocksOptionsValueUsd,
      currentOpenRisk
    ),
    currentOpenRisk,
    currentPositionMarketValue,
    currentPositionCloseRequirement: currentPositionMarketValue,
    openTradesCount: openTrades.length,
    maximumOptionsCapital: framework.maximumOptionsCapital,
    availableRiskCapacity: framework.availableRiskCapacity,
    maximumRiskPerTrade: framework.maximumRiskPerTrade,
  };
}

export function buildCapitalLiquidityCheck(
  base: CapitalLiquidityBase,
  newTradeRisk: number
): CapitalLiquidityResult {
  const stockDeployableCapital = calculateStockDeployableCapital(
    base.stocksEtfValue,
    base.currentOpenRisk
  );
  const remainingCapitalAfterNewTrade =
    stockDeployableCapital - newTradeRisk;
  const liquidityRatio = calculateLiquidityRatio(
    base.cash.cashAvailable,
    base.currentPositionCloseRequirement
  );
  const emergencyBuffer =
    base.cash.cashAvailable - base.currentPositionCloseRequirement;
  const afterNewTradeBuffer =
    base.cash.cashAvailable -
    base.currentPositionCloseRequirement -
    newTradeRisk;
  const capitalUtilizationPct = calculateCapitalUtilizationPct(
    base.currentOpenRisk,
    newTradeRisk,
    base.stocksEtfValue
  );

  const tradeEligible =
    newTradeRisk > 0 &&
    newTradeRisk <= base.maximumRiskPerTrade &&
    newTradeRisk <= base.availableRiskCapacity &&
    remainingCapitalAfterNewTrade >= 0 &&
    afterNewTradeBuffer >= 0 &&
    capitalUtilizationPct <= 75;

  const canCloseAllPositions =
    base.cash.cashAvailable >= base.currentPositionCloseRequirement;

  const finalStatus = getCapitalLiquidityStatus({
    liquidityRatio: Number.isFinite(liquidityRatio) ? liquidityRatio : 999,
    emergencyBuffer,
    capitalUtilizationPct,
  });

  const worstCaseOpenRisk = base.currentOpenRisk;
  const remainingCashAfterWorstCase =
    base.cash.cashAvailable -
    base.currentPositionCloseRequirement -
    worstCaseOpenRisk;

  return {
    ...base,
    newTradeRisk,
    stockDeployableCapital,
    remainingCapitalAfterNewTrade,
    liquidityRatio,
    emergencyBuffer,
    afterNewTradeBuffer,
    capitalUtilizationPct,
    tradeEligible,
    canCloseAllPositions,
    finalStatus,
    stressTest: {
      cashAvailable: base.cash.cashAvailable,
      currentCloseRequirement: base.currentPositionCloseRequirement,
      worstCaseOpenRisk,
      remainingCashAfterWorstCase,
      status: getStressTestStatus(
        remainingCashAfterWorstCase,
        liquidityRatio
      ),
    },
  };
}
