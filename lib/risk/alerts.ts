import {
  RISK_DTE_ALERT_THRESHOLD,
  RISK_MAX_OPTIONS_ALLOCATION_PCT,
  RISK_TAKE_PROFIT_PCT,
} from "./constants";
import type { EnrichedTrade } from "@/lib/trades/types";
import type { RiskAlert, RiskDashboardSummary, TickerExposureRow } from "./types";

export function buildRiskAlerts(
  summary: RiskDashboardSummary,
  openTrades: EnrichedTrade[],
  tickerExposure: TickerExposureRow[] = [],
  usdCashAvailable = 0
): RiskAlert[] {
  const alerts: RiskAlert[] = [];

  if (summary.optionsAllocationPct > RISK_MAX_OPTIONS_ALLOCATION_PCT) {
    alerts.push({
      code: "allocation_exceeded",
      severity: "danger",
      title: "Options Allocation Exceeded",
      message: `Options allocation ${summary.optionsAllocationPct.toFixed(1)}% exceeds ${RISK_MAX_OPTIONS_ALLOCATION_PCT}% maximum.`,
    });
  }

  const duplicateTickers = new Set(
    tickerExposure.filter((r) => r.isDuplicate).map((r) => r.ticker)
  );
  for (const ticker of duplicateTickers) {
    alerts.push({
      code: "duplicate_ticker",
      severity: "danger",
      title: "Duplicate Ticker Exposure",
      message: `${ticker} has more than one open trade — system assumes one trade per ticker.`,
      ticker,
    });
  }

  for (const trade of openTrades) {
    const calc = trade.calculations;

    if (calc.maxRisk > summary.maximumRiskPerTrade) {
      alerts.push({
        code: "trade_exceeds_max_risk",
        severity: "danger",
        title: "Trade Exceeds Max Risk",
        message: `${trade.ticker} max risk $${calc.maxRisk.toFixed(0)} exceeds $${summary.maximumRiskPerTrade.toFixed(0)} per-trade limit.`,
        ticker: trade.ticker,
      });
    }

    if (calc.dte < RISK_DTE_ALERT_THRESHOLD) {
      alerts.push({
        code: "dte_low",
        severity: "warning",
        title: "Low DTE",
        message: `${trade.ticker} DTE ${calc.dte} — expiration within ${RISK_DTE_ALERT_THRESHOLD} days.`,
        ticker: trade.ticker,
      });
    }

    if (calc.currentPnl >= calc.takeProfitPrice) {
      alerts.push({
        code: "profit_target",
        severity: "info",
        title: "Profit Target Reached",
        message: `${trade.ticker} P/L $${calc.currentPnl.toFixed(0)} ≥ ${RISK_TAKE_PROFIT_PCT}% target ($${calc.takeProfitPrice.toFixed(0)}).`,
        ticker: trade.ticker,
      });
    }

    if (trade.strategy === "sell_put" && calc.cashRequired != null) {
      if (usdCashAvailable < calc.cashRequired) {
        alerts.push({
          code: "sell_put_insufficient_cash",
          severity: "danger",
          title: "Sell Put — Insufficient USD Cash",
          message: `${trade.ticker} requires $${calc.cashRequired.toFixed(0)} USD cash for assignment (available $${usdCashAvailable.toFixed(0)}).`,
          ticker: trade.ticker,
        });
      }
    }

    if (trade.strategy === "sell_call") {
      if (trade.sellCallCoverage === "naked") {
        alerts.push({
          code: "naked_call_unlimited_risk",
          severity: "danger",
          title: "Naked Call — Unlimited Risk",
          message: `${trade.ticker}: Unlimited risk. Not recommended.`,
          ticker: trade.ticker,
        });
      } else if (calc.requiredShares != null) {
        const owned = trade.sharesOwned ?? 0;
        if (owned < calc.requiredShares) {
          alerts.push({
            code: "sell_call_insufficient_shares",
            severity: "danger",
            title: "Covered Call — Insufficient Shares",
            message: `${trade.ticker} requires ${calc.requiredShares} shares (owned ${owned}).`,
            ticker: trade.ticker,
          });
        }
      }
    }
  }

  return alerts;
}
