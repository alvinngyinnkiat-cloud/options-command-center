import type { CurrentValueSource, OptionsTrade } from "@/types/database";
import { buildTradeAlerts, deriveSuggestedAction } from "./alerts";
import { buildTradeCalculations } from "./calculations";
import { formatStatusLabel, formatStrategyLabel, formatStrikesDisplay } from "./format";
import { calculateTradePnlAllocation } from "./pnl-allocation";
import { isSellCallStrategy } from "./strategy-meta";
import type {
  EnrichedTrade,
  TradeFormInput,
  TradeStrikeInput,
  TradeTrackerStatus,
  UpdateCurrentValueInput,
} from "./types";
import {
  calculateCurrentCloseCost,
  calculateValueDifference,
  deriveSystemOptionValueFromCloseCost,
  resolveActiveValueSource,
  resolveEffectiveOptionValue,
} from "./valuation";

import type { TradeMarketContext } from "./types";

export type { TradeMarketContext };

function strikesFromTrade(row: OptionsTrade): TradeStrikeInput {
  return {
    shortStrikePut:
      row.short_strike_put != null ? Number(row.short_strike_put) : null,
    longStrikePut:
      row.long_strike_put != null ? Number(row.long_strike_put) : null,
    shortStrikeCall:
      row.short_strike_call != null ? Number(row.short_strike_call) : null,
    longStrikeCall:
      row.long_strike_call != null ? Number(row.long_strike_call) : null,
  };
}

export function resolveTradeValuation(row: OptionsTrade): {
  manualCurrentOptionValue: number | null;
  systemCurrentOptionValue: number;
  currentOptionValue: number;
  currentValueSource: CurrentValueSource;
  currentCloseCost: number;
} {
  const systemFromColumn =
    row.system_current_option_value != null
      ? Number(row.system_current_option_value)
      : null;
  const systemCurrentOptionValue =
    systemFromColumn ??
    deriveSystemOptionValueFromCloseCost(
      Number(row.current_value ?? 0),
      row.contracts
    );

  const manualCurrentOptionValue =
    row.manual_current_option_value != null
      ? Number(row.manual_current_option_value)
      : null;

  const currentOptionValue = resolveEffectiveOptionValue(
    manualCurrentOptionValue,
    systemCurrentOptionValue
  );

  const currentValueSource = resolveActiveValueSource(
    manualCurrentOptionValue,
    row.current_value_source ?? "system"
  );

  const currentCloseCost = calculateCurrentCloseCost(
    currentOptionValue,
    row.contracts
  );

  return {
    manualCurrentOptionValue,
    systemCurrentOptionValue,
    currentOptionValue,
    currentValueSource,
    currentCloseCost,
  };
}

export function formInputFromTrade(
  row: OptionsTrade,
  context: TradeMarketContext = {}
): TradeFormInput {
  const valuation = resolveTradeValuation(row);
  return {
    watchlistId: row.watchlist_id,
    ticker: row.ticker,
    strategy: row.strategy,
    status: row.status as TradeTrackerStatus,
    entryDate: row.entry_date,
    expirationDate: row.expiration_date,
    contracts: row.contracts,
    premiumPerContract: Number(row.credit_received),
    currentValue: valuation.currentCloseCost,
    exitDebit: row.exit_debit != null ? Number(row.exit_debit) : null,
    shortStrikePut:
      row.short_strike_put != null ? Number(row.short_strike_put) : null,
    longStrikePut:
      row.long_strike_put != null ? Number(row.long_strike_put) : null,
    shortStrikeCall:
      row.short_strike_call != null ? Number(row.short_strike_call) : null,
    longStrikeCall:
      row.long_strike_call != null ? Number(row.long_strike_call) : null,
    takeProfitTargetPct: Number(row.take_profit_target),
    stopLossTargetPct: Number(row.stop_loss_target),
    tradeScore: row.trade_score != null ? Number(row.trade_score) : null,
    recommendedStrategy: row.recommended_strategy,
    confidenceLevel: row.confidence_level,
    reasonForEntry: row.reason_for_entry,
    notes: row.notes,
    underlyingAveragePrice: context.underlyingAveragePrice ?? null,
    manualSupport: context.manualSupport ?? null,
    manualResistance: context.manualResistance ?? null,
    atr14: context.atr14 ?? null,
    tradeOwnership: row.trade_ownership ?? "personal",
    clientId: row.client_id,
    myProfitSharePercent: Number(row.my_profit_share_percent ?? 60),
    clientProfitSharePercent: Number(row.client_profit_share_percent ?? 40),
    sellCallCoverage: row.sell_call_coverage ?? "covered",
    sharesOwned: row.shares_owned != null ? Number(row.shares_owned) : null,
    parentTradeId: row.parent_trade_id,
    originalCost:
      row.original_cost != null ? Number(row.original_cost) : null,
  };
}

export function enrichTrade(
  row: OptionsTrade,
  context: TradeMarketContext = {}
): EnrichedTrade {
  const strikes = strikesFromTrade(row);
  const input = formInputFromTrade(row, context);
  const valuation = resolveTradeValuation(row);

  const calculations = buildTradeCalculations({
    strategy: input.strategy,
    expirationDate: input.expirationDate,
    contracts: input.contracts,
    premiumPerContract: input.premiumPerContract,
    currentOptionValuePerContract: valuation.currentOptionValue,
    underlyingCurrentPrice: context.underlyingCurrentPrice ?? null,
    exitDebit: input.exitDebit,
    status: input.status,
    takeProfitTargetPct: input.takeProfitTargetPct,
    stopLossTargetPct: input.stopLossTargetPct,
    sellCallCoverage: input.sellCallCoverage,
    originalCost: input.originalCost,
    strikes,
  });

  const status = input.status;
  const alerts = buildTradeAlerts({
    strategy: input.strategy,
    status,
    underlyingAveragePrice: input.underlyingAveragePrice,
    manualSupport: input.manualSupport,
    manualResistance: input.manualResistance,
    atr14: input.atr14,
    calculations,
    takeProfitTargetPct: input.takeProfitTargetPct,
  });

  const suggestedAction = deriveSuggestedAction(
    alerts,
    status,
    calculations.currentPnl,
    calculations.takeProfitPrice
  );

  const trade: EnrichedTrade = {
    id: row.id,
    watchlistId: row.watchlist_id,
    ticker: row.ticker,
    strategy: input.strategy,
    strategyLabel: formatStrategyLabel(row.strategy),
    status,
    statusLabel: formatStatusLabel(status),
    entryDate: row.entry_date,
    expirationDate: row.expiration_date,
    contracts: row.contracts,
    premiumPerContract: input.premiumPerContract,
    currentValue: calculations.currentCloseCost,
    currentOptionValue: valuation.currentOptionValue,
    manualCurrentOptionValue: valuation.manualCurrentOptionValue,
    systemCurrentOptionValue: valuation.systemCurrentOptionValue,
    currentValueSource: valuation.currentValueSource,
    currentValueUpdatedAt: row.current_value_updated_at,
    valueDifference: calculateValueDifference(
      valuation.manualCurrentOptionValue,
      valuation.systemCurrentOptionValue
    ),
    exitDebit: input.exitDebit,
    strikes,
    strikesDisplay: formatStrikesDisplay(row.strategy, strikes),
    takeProfitTargetPct: input.takeProfitTargetPct,
    stopLossTargetPct: input.stopLossTargetPct,
    tradeScore: input.tradeScore,
    recommendedStrategy: input.recommendedStrategy,
    confidenceLevel: input.confidenceLevel,
    reasonForEntry: input.reasonForEntry,
    notes: row.notes,
    underlyingAveragePrice: input.underlyingAveragePrice,
    underlyingCurrentPrice: context.underlyingCurrentPrice ?? null,
    manualSupport: input.manualSupport,
    manualResistance: input.manualResistance,
    atr14: input.atr14,
    calculations,
    pnlAllocation: { totalTradePnl: 0, myPnl: 0, clientPnl: 0 },
    alerts,
    suggestedAction,
    journalEntryCount: context.journalEntryCount ?? 0,
    tradeOwnership: row.trade_ownership ?? "personal",
    clientId: row.client_id,
    clientName: context.clientName ?? null,
    myProfitSharePercent: Number(row.my_profit_share_percent ?? 60),
    clientProfitSharePercent: Number(row.client_profit_share_percent ?? 40),
    isClientTrade: Boolean(row.is_client_trade),
    sellCallCoverage: input.sellCallCoverage,
    sharesOwned: input.sharesOwned,
    parentTradeId: input.parentTradeId,
    originalCost: input.originalCost,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };

  trade.pnlAllocation = calculateTradePnlAllocation(trade);
  return trade;
}

export function tradeFormInputFromEnriched(trade: EnrichedTrade): TradeFormInput {
  return {
    watchlistId: trade.watchlistId,
    ticker: trade.ticker,
    strategy: trade.strategy,
    status: trade.status,
    entryDate: trade.entryDate,
    expirationDate: trade.expirationDate,
    contracts: trade.contracts,
    premiumPerContract: trade.premiumPerContract,
    currentValue: trade.currentValue,
    exitDebit: trade.exitDebit,
    shortStrikePut: trade.strikes.shortStrikePut,
    longStrikePut: trade.strikes.longStrikePut,
    shortStrikeCall: trade.strikes.shortStrikeCall,
    longStrikeCall: trade.strikes.longStrikeCall,
    takeProfitTargetPct: trade.takeProfitTargetPct,
    stopLossTargetPct: trade.stopLossTargetPct,
    tradeScore: trade.tradeScore,
    recommendedStrategy: trade.recommendedStrategy,
    confidenceLevel: trade.confidenceLevel,
    reasonForEntry: trade.reasonForEntry,
    notes: trade.notes,
    underlyingAveragePrice: trade.underlyingAveragePrice,
    manualSupport: trade.manualSupport,
    manualResistance: trade.manualResistance,
    atr14: trade.atr14,
    tradeOwnership: trade.tradeOwnership,
    clientId: trade.clientId,
    myProfitSharePercent: trade.myProfitSharePercent,
    clientProfitSharePercent: trade.clientProfitSharePercent,
    sellCallCoverage: trade.sellCallCoverage,
    sharesOwned: trade.sharesOwned,
    parentTradeId: trade.parentTradeId,
    originalCost: trade.originalCost,
  };
}

export function applyCurrentValueUpdate(
  row: OptionsTrade,
  input: UpdateCurrentValueInput
): OptionsTrade {
  const valuation = resolveTradeValuation(row);
  const manualCurrentOptionValue = input.currentOptionValue;
  const currentOptionValue = resolveEffectiveOptionValue(
    manualCurrentOptionValue,
    valuation.systemCurrentOptionValue
  );
  const currentCloseCost = calculateCurrentCloseCost(
    currentOptionValue,
    row.contracts
  );

  const strikes = strikesFromTrade(row);
  const calc = buildTradeCalculations({
    strategy: row.strategy,
    expirationDate: row.expiration_date,
    contracts: row.contracts,
    premiumPerContract: Number(row.credit_received),
    currentOptionValuePerContract: currentOptionValue,
    exitDebit: row.exit_debit != null ? Number(row.exit_debit) : null,
    status: row.status,
    takeProfitTargetPct: Number(row.take_profit_target),
    stopLossTargetPct: Number(row.stop_loss_target),
    sellCallCoverage: row.sell_call_coverage ?? "covered",
    originalCost:
      row.original_cost != null ? Number(row.original_cost) : null,
    strikes,
  });

  const activePnl =
    row.status === "closed" && calc.realizedPnl != null
      ? calc.realizedPnl
      : calc.currentPnl;

  const notes =
    input.notes != null && input.notes.trim()
      ? row.notes
        ? `${row.notes}\n${input.notes.trim()}`
        : input.notes.trim()
      : row.notes;

  return {
    ...row,
    manual_current_option_value: manualCurrentOptionValue,
    system_current_option_value: valuation.systemCurrentOptionValue,
    current_value_source: input.source,
    current_value_updated_at: new Date().toISOString(),
    current_value: currentCloseCost,
    current_pnl: activePnl,
    pnl_percent: calc.returnOnRiskPct,
    notes,
    updated_at: new Date().toISOString(),
  };
}

export function tradeRowFromForm(
  input: TradeFormInput,
  userId: string,
  existingId?: string,
  existingRow?: OptionsTrade | null
): OptionsTrade {
  const strikes: TradeStrikeInput = {
    shortStrikePut: input.shortStrikePut,
    longStrikePut: input.longStrikePut,
    shortStrikeCall: input.shortStrikeCall,
    longStrikeCall: input.longStrikeCall,
  };

  const isClosed = input.status === "closed";
  const preservedManual = isClosed
    ? null
    : (existingRow?.manual_current_option_value ?? null);
  const preservedSystem = isClosed
    ? 0
    : existingRow?.system_current_option_value != null
      ? Number(existingRow.system_current_option_value)
      : deriveSystemOptionValueFromCloseCost(input.currentValue, input.contracts);
  const preservedSource = isClosed
    ? "system"
    : (existingRow?.current_value_source ?? "system");
  const preservedUpdatedAt = isClosed
    ? null
    : existingRow?.current_value_updated_at ?? null;

  const currentOptionValue = resolveEffectiveOptionValue(
    preservedManual != null ? Number(preservedManual) : null,
    preservedSystem
  );

  const calc = buildTradeCalculations({
    strategy: input.strategy,
    expirationDate: input.expirationDate,
    contracts: input.contracts,
    premiumPerContract: input.premiumPerContract,
    currentOptionValuePerContract: currentOptionValue,
    exitDebit: input.exitDebit,
    status: input.status,
    takeProfitTargetPct: input.takeProfitTargetPct,
    stopLossTargetPct: input.stopLossTargetPct,
    sellCallCoverage: input.sellCallCoverage,
    originalCost: input.originalCost,
    strikes,
  });

  const activePnl =
    input.status === "closed" && calc.realizedPnl != null
      ? calc.realizedPnl
      : calc.currentPnl;

  const now = new Date().toISOString();

  return {
    id: existingId ?? crypto.randomUUID(),
    user_id: userId,
    watchlist_id: input.watchlistId,
    ticker: input.ticker.toUpperCase(),
    strategy: input.strategy,
    status: input.status as OptionsTrade["status"],
    entry_date: input.entryDate,
    expiration_date: input.expirationDate,
    dte: calc.dte,
    contracts: input.contracts,
    credit_received: input.premiumPerContract,
    max_risk: calc.maxRisk,
    current_pnl: activePnl,
    pnl_percent: calc.returnOnRiskPct,
    take_profit_target: input.takeProfitTargetPct,
    stop_loss_target: input.stopLossTargetPct,
    short_strike_put: input.shortStrikePut,
    long_strike_put: input.longStrikePut,
    short_strike_call: input.shortStrikeCall,
    long_strike_call: input.longStrikeCall,
    notes: input.notes,
    width: calc.width,
    current_value: calc.currentCloseCost,
    manual_current_option_value: preservedManual,
    system_current_option_value: preservedSystem,
    current_value_source: preservedSource,
    current_value_updated_at: preservedUpdatedAt,
    exit_debit: input.exitDebit,
    realized_pnl: calc.realizedPnl,
    buying_power_used: calc.buyingPowerUsed,
    breakeven_put: calc.breakevenPut,
    breakeven_call: calc.breakevenCall,
    take_profit_price: calc.takeProfitPrice,
    stop_loss_price: calc.stopLossPrice,
    trade_score: input.tradeScore,
    recommended_strategy: input.recommendedStrategy,
    confidence_level: input.confidenceLevel,
    reason_for_entry: input.reasonForEntry,
    trade_ownership: input.tradeOwnership,
    client_id:
      input.tradeOwnership === "client_profit_sharing" ? input.clientId : null,
    my_profit_share_percent: input.myProfitSharePercent,
    client_profit_share_percent: input.clientProfitSharePercent,
    is_client_trade: input.tradeOwnership === "client_profit_sharing",
    sell_call_coverage: isSellCallStrategy(input.strategy)
      ? input.sellCallCoverage
      : null,
    shares_owned: isSellCallStrategy(input.strategy)
      ? input.sharesOwned
      : null,
    parent_trade_id: input.parentTradeId,
    original_cost: input.originalCost,
    created_at: existingRow?.created_at ?? now,
    updated_at: now,
  };
}
