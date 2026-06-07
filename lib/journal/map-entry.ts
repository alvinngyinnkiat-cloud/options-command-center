import type { EnrichedTrade } from "@/lib/trades/types";
import {
  calculateClientPnL,
  calculateMyPnL,
  isClientProfitSharingTrade,
} from "@/lib/trades/pnl-allocation";
import { buildJournalComputedFields } from "./calculations";
import { formatStrategyLabel } from "./format";
import type {
  EnrichedJournalEntry,
  ExitReason,
  JournalFormInput,
} from "./types";
import type { TradingJournalEntry } from "@/types/database";
import type { StrategyType } from "@/types/database";

function parseExitReason(value: string | null): ExitReason | null {
  if (!value) return null;
  const reasons: ExitReason[] = [
    "75% Profit Target",
    "Expired Worthless",
    "Early Profit Taking",
    "Manual Exit",
  ];
  return reasons.includes(value as ExitReason) ? (value as ExitReason) : null;
}

export function enrichJournalEntry(
  row: TradingJournalEntry,
  linkedTrade?: EnrichedTrade | null
): EnrichedJournalEntry {
  const strategy = (row.strategy as StrategyType | null) ?? null;
  const creditReceived =
    row.credit_received != null ? Number(row.credit_received) : null;
  const exitDebit = row.exit_debit != null ? Number(row.exit_debit) : null;
  const maxRisk = row.max_risk != null ? Number(row.max_risk) : null;

  const computed = buildJournalComputedFields({
    entryDate: row.entry_date,
    exitDate: row.exit_date,
    creditReceived,
    exitDebit,
    maxRisk,
  });

  const isClosed = row.exit_date != null && computed.profitLoss != null;

  const profitLoss =
    row.profit_loss != null ? Number(row.profit_loss) : computed.profitLoss;
  const totalTradeProfitLoss = profitLoss;
  const myProfitLoss =
    profitLoss != null && linkedTrade && isClientProfitSharingTrade(linkedTrade)
      ? calculateMyPnL(linkedTrade, profitLoss)
      : profitLoss;
  const clientProfitLoss =
    profitLoss != null && linkedTrade && isClientProfitSharingTrade(linkedTrade)
      ? calculateClientPnL(linkedTrade, profitLoss)
      : profitLoss != null
        ? 0
        : null;

  return {
    id: row.id,
    tradeId: row.trade_id,
    ticker: row.ticker,
    title: row.title,
    entryDate: row.entry_date,
    strategy,
    strategyLabel: formatStrategyLabel(strategy),
    dte: row.dte,
    contracts: row.contracts,
    shortStrike: row.short_strike != null ? Number(row.short_strike) : null,
    longStrike: row.long_strike != null ? Number(row.long_strike) : null,
    width: row.width != null ? Number(row.width) : null,
    creditReceived,
    breakeven: row.breakeven != null ? Number(row.breakeven) : null,
    maxRisk,
    buyingPowerUsed:
      row.buying_power_used != null ? Number(row.buying_power_used) : null,
    tradeScore: row.trade_score != null ? Number(row.trade_score) : null,
    confidenceLevel: row.confidence_level,
    reasonForEntry: row.reason_for_entry,
    exitDate: row.exit_date,
    exitDebit,
    daysHeld: row.days_held ?? computed.daysHeld,
    profitLoss,
    totalTradeProfitLoss,
    myProfitLoss,
    clientProfitLoss,
    returnOnRiskPct:
      row.return_on_risk_pct != null
        ? Number(row.return_on_risk_pct)
        : computed.returnOnRiskPct,
    winLoss:
      (row.win_loss as EnrichedJournalEntry["winLoss"]) ?? computed.winLoss,
    exitReason: parseExitReason(row.exit_reason),
    lessonLearned: row.lesson_learned,
    entrySetup: row.entry_setup,
    exitOutcome: row.exit_outcome,
    whatWentWell: row.what_went_well,
    whatToImprove: row.what_to_improve,
    reviewNotes: row.review_notes ?? row.content,
    screenshotUrl: row.screenshot_url,
    tags: row.tags ?? [],
    isClosed,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function journalFormFromTrade(trade: EnrichedTrade): JournalFormInput {
  const calc = trade.calculations;
  const shortStrike =
    trade.strategy === "bear_call_spread"
      ? trade.strikes.shortStrikeCall
      : trade.strikes.shortStrikePut;
  const longStrike =
    trade.strategy === "bear_call_spread"
      ? trade.strikes.longStrikeCall
      : trade.strikes.longStrikePut;

  const breakeven =
    trade.strategy === "bear_call_spread"
      ? calc.breakevenCall
      : calc.breakevenPut;

  return {
    tradeId: trade.id,
    ticker: trade.ticker,
    entryDate: trade.entryDate,
    strategy: trade.strategy,
    dte: calc.dte,
    contracts: trade.contracts,
    shortStrike,
    longStrike,
    width: calc.width,
    creditReceived: calc.totalPremiumReceived,
    breakeven,
    maxRisk: calc.maxRisk,
    buyingPowerUsed: calc.buyingPowerUsed,
    tradeScore: trade.tradeScore,
    confidenceLevel: trade.confidenceLevel,
    reasonForEntry: trade.reasonForEntry,
    exitDate: trade.status === "closed" ? trade.entryDate : null,
    exitDebit: trade.exitDebit,
    exitReason: null,
    lessonLearned: null,
    entrySetup: trade.reasonForEntry,
    exitOutcome: null,
    whatWentWell: null,
    whatToImprove: null,
    reviewNotes: trade.notes,
    screenshotUrl: null,
    tags: [],
  };
}

export function journalRowFromForm(
  input: JournalFormInput,
  userId: string,
  existingId?: string,
  existingCreatedAt?: string
): TradingJournalEntry {
  const computed = buildJournalComputedFields({
    entryDate: input.entryDate,
    exitDate: input.exitDate,
    creditReceived: input.creditReceived,
    exitDebit: input.exitDebit,
    maxRisk: input.maxRisk,
  });

  const strategyLabel = formatStrategyLabel(input.strategy);
  const now = new Date().toISOString();

  return {
    id: existingId ?? crypto.randomUUID(),
    user_id: userId,
    trade_id: input.tradeId,
    ticker: input.ticker.toUpperCase(),
    entry_date: input.entryDate,
    title: `${input.ticker.toUpperCase()} ${strategyLabel}`,
    content: input.reviewNotes ?? "",
    lesson_learned: input.lessonLearned,
    tags: input.tags,
    mood: null,
    outcome: computed.winLoss,
    strategy: input.strategy,
    dte: input.dte,
    contracts: input.contracts,
    short_strike: input.shortStrike,
    long_strike: input.longStrike,
    width: input.width,
    credit_received: input.creditReceived,
    breakeven: input.breakeven,
    max_risk: input.maxRisk,
    buying_power_used: input.buyingPowerUsed,
    trade_score: input.tradeScore,
    confidence_level: input.confidenceLevel,
    reason_for_entry: input.reasonForEntry,
    exit_date: input.exitDate,
    exit_debit: input.exitDebit,
    days_held: computed.daysHeld,
    profit_loss: computed.profitLoss,
    return_on_risk_pct: computed.returnOnRiskPct,
    win_loss: computed.winLoss,
    exit_reason: input.exitReason,
    entry_setup: input.entrySetup,
    exit_outcome: input.exitOutcome,
    what_went_well: input.whatWentWell,
    what_to_improve: input.whatToImprove,
    review_notes: input.reviewNotes,
    screenshot_url: input.screenshotUrl,
    created_at: existingCreatedAt ?? now,
    updated_at: now,
  };
}
