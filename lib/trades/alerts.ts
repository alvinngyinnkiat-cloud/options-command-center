import {
  BREAKEVEN_PROXIMITY_PCT,
  DEFAULT_TAKE_PROFIT_PCT,
  DTE_WARNING_THRESHOLD,
  SR_DANGER_ATR_MULTIPLIER,
} from "./constants";
import type {
  EnrichedTrade,
  SuggestedAction,
  TradeAlert,
  TradeCalculations,
} from "./types";
import type { StrategyType } from "@/types/database";

function isNearBreakeven(
  averagePrice: number | null,
  breakeven: number | null
): boolean {
  if (averagePrice == null || breakeven == null || breakeven <= 0) return false;
  const diffPct = (Math.abs(averagePrice - breakeven) / breakeven) * 100;
  return diffPct <= BREAKEVEN_PROXIMITY_PCT;
}

function isNearSrDanger(
  strategy: StrategyType,
  averagePrice: number | null,
  support: number | null,
  resistance: number | null,
  atr14: number | null
): boolean {
  if (averagePrice == null || atr14 == null || atr14 <= 0) return false;
  const threshold = atr14 * SR_DANGER_ATR_MULTIPLIER;

  if (strategy === "bull_put_spread" && support != null) {
    return Math.abs(averagePrice - support) <= threshold;
  }
  if (strategy === "sell_put" && support != null) {
    return Math.abs(averagePrice - support) <= threshold;
  }
  if (strategy === "bear_call_spread" && resistance != null) {
    return Math.abs(averagePrice - resistance) <= threshold;
  }
  if (strategy === "sell_call" && resistance != null) {
    return Math.abs(averagePrice - resistance) <= threshold;
  }
  if (strategy === "iron_condor") {
    const nearSupport =
      support != null && Math.abs(averagePrice - support) <= threshold;
    const nearResistance =
      resistance != null && Math.abs(averagePrice - resistance) <= threshold;
    return nearSupport || nearResistance;
  }
  return false;
}

export function buildTradeAlerts(trade: {
  strategy: StrategyType;
  status: string;
  underlyingAveragePrice: number | null;
  manualSupport: number | null;
  manualResistance: number | null;
  atr14: number | null;
  calculations: TradeCalculations;
  takeProfitTargetPct: number;
}): TradeAlert[] {
  const alerts: TradeAlert[] = [];
  const { calculations: calc } = trade;

  if (trade.status === "open" || trade.status === "managed") {
    if (calc.dte < DTE_WARNING_THRESHOLD) {
      alerts.push({
        code: "dte_low",
        message: `DTE ${calc.dte} — expiration within ${DTE_WARNING_THRESHOLD} days`,
        severity: "warning",
      });
    }

    if (calc.takeProfitReached) {
      alerts.push({
        code: "profit_target",
        message: `Take Profit Reached — P/L $${calc.currentPnl.toFixed(0)} ≥ target $${calc.profitTargetAmount.toFixed(0)}`,
        severity: "info",
      });
    }

    if (calc.stopLossWarning) {
      alerts.push({
        code: "stop_loss",
        message: `Stop Loss Warning — close cost $${calc.currentCloseCost.toFixed(0)} ≥ limit $${calc.stopLossAmount.toFixed(0)}`,
        severity: "warning",
      });
    }

    const primaryBe =
      trade.strategy === "bear_call_spread"
        ? calc.breakevenCall
        : calc.breakevenPut;

    if (isNearBreakeven(trade.underlyingAveragePrice, primaryBe)) {
      alerts.push({
        code: "near_breakeven",
        message: `Underlying avg price near breakeven (${calc.breakevenDisplay})`,
        severity: "warning",
      });
    }

    if (
      isNearSrDanger(
        trade.strategy,
        trade.underlyingAveragePrice,
        trade.manualSupport,
        trade.manualResistance,
        trade.atr14
      )
    ) {
      alerts.push({
        code: "sr_danger",
        message:
          "Underlying avg price near manual support/resistance danger zone",
        severity: "warning",
      });
    }
  }

  return alerts;
}

export function deriveSuggestedAction(
  alerts: TradeAlert[],
  status: string,
  currentPnl: number,
  takeProfitPrice: number
): SuggestedAction {
  if (status === "closed" || status === "rolled") return "Hold";

  const hasCloseSignal = alerts.some(
    (a) => a.code === "profit_target" || a.code === "dte_low"
  );
  const hasReviewSignal = alerts.some(
    (a) =>
      a.code === "near_breakeven" ||
      a.code === "sr_danger" ||
      currentPnl < 0
  );

  if (hasCloseSignal && currentPnl >= takeProfitPrice * 0.5) {
    return "Close Position";
  }
  if (hasReviewSignal) return "Review Position";
  return "Hold";
}
