import { differenceInCalendarDays, parseISO, startOfDay } from "date-fns";
import {
  DEFAULT_STOP_LOSS_PCT,
  DEFAULT_TAKE_PROFIT_PCT,
  TP_CLOSE_FEE,
  TP_REMAINING_PCT,
} from "./constants";
import { calculateBreakevenSafety } from "./breakeven-safety";
import {
  calculateCoveredCallMaxRisk,
  calculateSellCallRequiredShares,
  calculateSellPutCashRequired,
  calculateSellPutMaxRisk,
  isDebitLongStrategy,
  isLeapsStrategy,
  isSellCallStrategy,
  isSellPutStrategy,
  isVerticalCallSpreadStrategy,
} from "./strategy-meta";
import {
  calculateCurrentCloseCost,
  evaluateProfitStopStatus,
} from "./valuation";
import type { TradeCalculations, TradeFormInput, TradeStrikeInput } from "./types";
import type { StrategyType } from "@/types/database";

export function calculateDte(
  expirationDate: string,
  reference = new Date()
): number {
  const exp = startOfDay(parseISO(expirationDate));
  const today = startOfDay(reference);
  return Math.max(0, differenceInCalendarDays(exp, today));
}

export function calculateSpreadWidth(
  strategy: StrategyType,
  strikes: TradeStrikeInput
): number {
  switch (strategy) {
    case "bull_put_spread": {
      if (strikes.shortStrikePut == null || strikes.longStrikePut == null)
        return 0;
      return strikes.shortStrikePut - strikes.longStrikePut;
    }
    case "bear_call_spread": {
      if (strikes.shortStrikeCall == null || strikes.longStrikeCall == null)
        return 0;
      return strikes.longStrikeCall - strikes.shortStrikeCall;
    }
    case "iron_condor": {
      const putWidth =
        strikes.shortStrikePut != null && strikes.longStrikePut != null
          ? strikes.shortStrikePut - strikes.longStrikePut
          : 0;
      const callWidth =
        strikes.shortStrikeCall != null && strikes.longStrikeCall != null
          ? strikes.longStrikeCall - strikes.shortStrikeCall
          : 0;
      return Math.max(putWidth, callWidth);
    }
    case "sell_put":
    case "sell_call":
    case "leaps":
      return 0;
    case "vertical_call_spread": {
      if (strikes.shortStrikeCall == null || strikes.longStrikeCall == null)
        return 0;
      return strikes.shortStrikeCall - strikes.longStrikeCall;
    }
    default:
      return 0;
  }
}

/** Premium per contract × 100 × contracts */
export function calculateTotalPremiumReceived(
  premiumPerContract: number,
  contracts: number
): number {
  return premiumPerContract * 100 * contracts;
}

/** (width × 100 × contracts) − total premium received */
export function calculateMaxRisk(
  width: number,
  contracts: number,
  totalPremiumReceived: number
): number {
  const gross = width * 100 * contracts;
  return Math.max(0, gross - totalPremiumReceived);
}

export function calculateReturnOnRiskPct(
  profitLoss: number,
  maxRisk: number
): number {
  if (maxRisk <= 0) return 0;
  return (profitLoss / maxRisk) * 100;
}

function roundToTwoDecimals(value: number): number {
  return Math.round(value * 100) / 100;
}

/** Gross 25% per-contract close price before transaction fee adjustment */
export function calculateTakeProfitNetOfFees(
  premiumPerContract: number
): number {
  return roundToTwoDecimals(premiumPerContract * TP_REMAINING_PCT);
}

/**
 * Per-contract limit order price to close at ~75% profit,
 * net of an estimated $0.01 closing fee.
 */
export function calculateTakeProfitClosePrice(
  premiumPerContract: number
): number {
  const adjusted = roundToTwoDecimals(
    premiumPerContract * TP_REMAINING_PCT - TP_CLOSE_FEE
  );
  return Math.max(0.01, adjusted);
}

/** Dollar profit target at 75% of total premium received */
export function calculateTakeProfitPrice(
  totalPremiumReceived: number,
  takeProfitPct = DEFAULT_TAKE_PROFIT_PCT
): number {
  return totalPremiumReceived * (takeProfitPct / 100);
}

/** Dollar loss limit from stop-loss % of premium */
export function calculateStopLossPrice(
  totalPremiumReceived: number,
  stopLossPct = DEFAULT_STOP_LOSS_PCT
): number {
  return totalPremiumReceived * (stopLossPct / 100);
}

export interface BreakevenResult {
  put: number | null;
  call: number | null;
  display: string;
}

/** Credit is per-share (premium per contract). */
export function calculateBreakeven(
  strategy: StrategyType,
  strikes: TradeStrikeInput,
  premiumPerContract: number
): BreakevenResult {
  const credit = premiumPerContract;

  switch (strategy) {
    case "bull_put_spread": {
      if (strikes.shortStrikePut == null) {
        return { put: null, call: null, display: "—" };
      }
      const be = strikes.shortStrikePut - credit;
      return {
        put: be,
        call: null,
        display: be.toFixed(2),
      };
    }
    case "bear_call_spread": {
      if (strikes.shortStrikeCall == null) {
        return { put: null, call: null, display: "—" };
      }
      const be = strikes.shortStrikeCall + credit;
      return {
        put: null,
        call: be,
        display: be.toFixed(2),
      };
    }
    case "iron_condor": {
      const putBe =
        strikes.shortStrikePut != null
          ? strikes.shortStrikePut - credit
          : null;
      const callBe =
        strikes.shortStrikeCall != null
          ? strikes.shortStrikeCall + credit
          : null;
      const display =
        putBe != null && callBe != null
          ? `P ${putBe.toFixed(2)} / C ${callBe.toFixed(2)}`
          : "—";
      return { put: putBe, call: callBe, display };
    }
    case "sell_put": {
      if (strikes.shortStrikePut == null) {
        return { put: null, call: null, display: "—" };
      }
      const be = strikes.shortStrikePut - credit;
      return { put: be, call: null, display: be.toFixed(2) };
    }
    case "sell_call": {
      if (strikes.shortStrikeCall == null) {
        return { put: null, call: null, display: "—" };
      }
      const be = strikes.shortStrikeCall + credit;
      return { put: null, call: be, display: be.toFixed(2) };
    }
    case "leaps": {
      const strike = strikes.longStrikeCall ?? strikes.shortStrikeCall;
      if (strike == null) {
        return { put: null, call: null, display: "—" };
      }
      const be = strike + credit;
      return { put: null, call: be, display: be.toFixed(2) };
    }
    case "vertical_call_spread": {
      if (strikes.longStrikeCall == null) {
        return { put: null, call: null, display: "—" };
      }
      const be = strikes.longStrikeCall + credit;
      return { put: null, call: be, display: be.toFixed(2) };
    }
    default:
      return { put: null, call: null, display: "—" };
  }
}

/** Open position: premium received − current close cost */
export function calculateCurrentPnl(
  totalPremiumReceived: number,
  currentCloseCost: number
): number {
  return totalPremiumReceived - currentCloseCost;
}

/** Closed position: total premium − exit debit */
export function calculateRealizedPnl(
  totalPremiumReceived: number,
  exitDebit: number
): number {
  return totalPremiumReceived - exitDebit;
}

export function buildTradeCalculations(
  input: Pick<
    TradeFormInput,
    | "strategy"
    | "expirationDate"
    | "contracts"
    | "premiumPerContract"
    | "exitDebit"
    | "status"
    | "takeProfitTargetPct"
    | "stopLossTargetPct"
    | "sellCallCoverage"
  > & {
    originalCost?: number | null;
    currentOptionValuePerContract: number;
    underlyingCurrentPrice?: number | null;
    strikes: TradeStrikeInput;
  },
  reference = new Date()
): TradeCalculations {
  const width = calculateSpreadWidth(input.strategy, input.strikes);
  const totalPremiumReceived = calculateTotalPremiumReceived(
    input.premiumPerContract,
    input.contracts
  );

  let maxRisk: number;
  let buyingPowerUsed: number;
  let cashRequired: number | null = null;
  let requiredShares: number | null = null;
  let unlimitedRisk = false;

  if (
    isSellPutStrategy(input.strategy) &&
    input.strikes.shortStrikePut != null
  ) {
    cashRequired = calculateSellPutCashRequired(
      input.strikes.shortStrikePut,
      input.contracts
    );
    maxRisk = calculateSellPutMaxRisk(
      input.strikes.shortStrikePut,
      input.contracts,
      totalPremiumReceived
    );
    buyingPowerUsed = cashRequired;
  } else if (
    isSellCallStrategy(input.strategy) &&
    input.strikes.shortStrikeCall != null
  ) {
    requiredShares = calculateSellCallRequiredShares(input.contracts);
    if (input.sellCallCoverage === "naked") {
      unlimitedRisk = true;
      maxRisk = 0;
      buyingPowerUsed = 0;
    } else {
      maxRisk = calculateCoveredCallMaxRisk(
        input.strikes.shortStrikeCall,
        input.contracts,
        totalPremiumReceived
      );
      buyingPowerUsed = maxRisk;
    }
  } else if (isDebitLongStrategy(input.strategy)) {
    const totalCost =
      input.originalCost ??
      calculateTotalPremiumReceived(
        input.premiumPerContract,
        input.contracts
      );
    maxRisk = totalCost;
    buyingPowerUsed = totalCost;
  } else {
    maxRisk = calculateMaxRisk(width, input.contracts, totalPremiumReceived);
    buyingPowerUsed = maxRisk;
  }
  const breakeven = calculateBreakeven(
    input.strategy,
    input.strikes,
    input.premiumPerContract
  );
  const takeProfitPrice = calculateTakeProfitPrice(
    totalPremiumReceived,
    input.takeProfitTargetPct
  );
  const takeProfitNetOfFees = calculateTakeProfitNetOfFees(
    input.premiumPerContract
  );
  const takeProfitClosePrice = calculateTakeProfitClosePrice(
    input.premiumPerContract
  );
  const stopLossPrice = calculateStopLossPrice(
    totalPremiumReceived,
    input.stopLossTargetPct
  );

  const currentCloseCost = calculateCurrentCloseCost(
    input.currentOptionValuePerContract,
    input.contracts
  );

  const debitCost =
    input.originalCost ??
    calculateTotalPremiumReceived(input.premiumPerContract, input.contracts);

  const currentPnl = isDebitLongStrategy(input.strategy)
    ? currentCloseCost - debitCost
    : calculateCurrentPnl(totalPremiumReceived, currentCloseCost);

  const realizedPnl =
    input.exitDebit != null
      ? isDebitLongStrategy(input.strategy)
        ? input.exitDebit - debitCost
        : calculateRealizedPnl(totalPremiumReceived, input.exitDebit)
      : null;

  const activePnl =
    input.status === "closed" && realizedPnl != null
      ? realizedPnl
      : currentPnl;

  const profitStop = evaluateProfitStopStatus({
    currentPnl,
    currentCloseCost,
    profitTargetAmount: takeProfitPrice,
    stopLossAmount: stopLossPrice,
  });

  const breakevenSafety = calculateBreakevenSafety({
    strategy: input.strategy,
    premiumPerContract: input.premiumPerContract,
    currentStockPrice: input.underlyingCurrentPrice ?? null,
    strikes: input.strikes,
    breakevenPut: breakeven.put,
    breakevenCall: breakeven.call,
  });

  return {
    width,
    totalPremiumReceived,
    maxRisk,
    buyingPowerUsed,
    returnOnRiskPct: unlimitedRisk
      ? 0
      : calculateReturnOnRiskPct(activePnl, maxRisk),
    currentPnlPct: unlimitedRisk
      ? 0
      : calculateReturnOnRiskPct(currentPnl, maxRisk),
    dte: calculateDte(input.expirationDate, reference),
    breakevenPut: breakeven.put,
    breakevenCall: breakeven.call,
    breakevenDisplay: breakeven.display,
    breakevenPrice: breakevenSafety.breakevenPrice,
    breakevenPutPrice: breakevenSafety.breakevenPutPrice,
    breakevenCallPrice: breakevenSafety.breakevenCallPrice,
    breakevenSafetyDistance: breakevenSafety.distance,
    breakevenSafetyDistancePct: breakevenSafety.distancePct,
    breakevenNearestSide: breakevenSafety.nearestSide,
    breakevenSafetyStatus: breakevenSafety.status,
    takeProfitPrice,
    takeProfitClosePrice,
    takeProfitNetOfFees,
    stopLossPrice,
    profitTargetAmount: takeProfitPrice,
    stopLossAmount: stopLossPrice,
    currentOptionValuePerContract: input.currentOptionValuePerContract,
    currentCloseCost,
    currentPnl,
    realizedPnl,
    takeProfitReached: profitStop.takeProfitReached,
    stopLossWarning: profitStop.stopLossWarning,
    cashRequired,
    requiredShares,
    unlimitedRisk,
  };
}
