import type { StrategyType } from "@/types/database";
import { TRADE_STATUS_OPTIONS, TRADE_STRATEGY_OPTIONS } from "./constants";
import type { TradeStrikeInput, TradeTrackerStatus } from "./types";

export function formatStrategyLabel(strategy: StrategyType): string {
  return (
    TRADE_STRATEGY_OPTIONS.find((s) => s.value === strategy)?.label ?? strategy
  );
}

export function formatStatusLabel(status: TradeTrackerStatus): string {
  return (
    TRADE_STATUS_OPTIONS.find((s) => s.value === status)?.label ?? status
  );
}

export function formatCurrency(value: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}

export function formatSignedCurrency(value: number): string {
  const abs = formatCurrency(Math.abs(value));
  return value >= 0 ? `+${abs}` : `-${abs}`;
}

export function formatStrikesDisplay(
  strategy: StrategyType,
  strikes: TradeStrikeInput
): string {
  switch (strategy) {
    case "bull_put_spread":
      return `${strikes.shortStrikePut ?? "—"} / ${strikes.longStrikePut ?? "—"} P`;
    case "bear_call_spread":
      return `${strikes.shortStrikeCall ?? "—"} / ${strikes.longStrikeCall ?? "—"} C`;
    case "iron_condor":
      return `P ${strikes.shortStrikePut ?? "—"}/${strikes.longStrikePut ?? "—"} · C ${strikes.shortStrikeCall ?? "—"}/${strikes.longStrikeCall ?? "—"}`;
    case "sell_put":
      return `${strikes.shortStrikePut ?? "—"} P`;
    case "sell_call":
      return `${strikes.shortStrikeCall ?? "—"} C`;
    case "leaps":
      return `${strikes.longStrikeCall ?? strikes.shortStrikeCall ?? "—"} C LEAPS`;
    case "vertical_call_spread":
      return `${strikes.longStrikeCall ?? "—"} / ${strikes.shortStrikeCall ?? "—"} C`;
    default:
      return "—";
  }
}

export function formatPercent(value: number, decimals = 1): string {
  return `${value.toFixed(decimals)}%`;
}

export function formatOptionValuePerContract(value: number): string {
  return `$${value.toFixed(2)}`;
}

export function formatValueSourceLabel(
  source: "manual" | "broker" | "system"
): string {
  switch (source) {
    case "manual":
      return "Manual Broker Value";
    case "broker":
      return "Broker";
    case "system":
      return "System Value";
  }
}

export function formatShortStrike(
  strategy: StrategyType,
  strikes: TradeStrikeInput
): string {
  switch (strategy) {
    case "bull_put_spread":
      return strikes.shortStrikePut != null ? String(strikes.shortStrikePut) : "—";
    case "bear_call_spread":
      return strikes.shortStrikeCall != null
        ? String(strikes.shortStrikeCall)
        : "—";
    case "iron_condor": {
      const put = strikes.shortStrikePut;
      const call = strikes.shortStrikeCall;
      if (put != null && call != null) return `${put} P / ${call} C`;
      return "—";
    }
    case "sell_put":
      return strikes.shortStrikePut != null ? String(strikes.shortStrikePut) : "—";
    case "sell_call":
      return strikes.shortStrikeCall != null
        ? String(strikes.shortStrikeCall)
        : "—";
    case "leaps":
      return strikes.longStrikeCall != null
        ? String(strikes.longStrikeCall)
        : "—";
    case "vertical_call_spread":
      return strikes.longStrikeCall != null
        ? String(strikes.longStrikeCall)
        : "—";
    default:
      return "—";
  }
}

export function formatLongStrike(
  strategy: StrategyType,
  strikes: TradeStrikeInput
): string {
  switch (strategy) {
    case "bull_put_spread":
      return strikes.longStrikePut != null ? String(strikes.longStrikePut) : "—";
    case "bear_call_spread":
      return strikes.longStrikeCall != null
        ? String(strikes.longStrikeCall)
        : "—";
    case "iron_condor": {
      const put = strikes.longStrikePut;
      const call = strikes.longStrikeCall;
      if (put != null && call != null) return `${put} P / ${call} C`;
      return "—";
    }
    case "sell_put":
    case "sell_call":
    case "leaps":
      return "—";
    case "vertical_call_spread":
      return strikes.shortStrikeCall != null
        ? String(strikes.shortStrikeCall)
        : "—";
    default:
      return "—";
  }
}

export function formatClientAllocation(trade: {
  isClientTrade: boolean;
  clientName: string | null;
  clientProfitSharePercent: number;
}): string {
  if (!trade.isClientTrade || !trade.clientName) return "Personal";
  return `${trade.clientName} (${trade.clientProfitSharePercent}%)`;
}
