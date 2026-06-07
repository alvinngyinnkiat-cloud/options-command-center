import { differenceInCalendarDays, parseISO, startOfDay } from "date-fns";
import type {
  EnrichedJournalEntry,
  JournalComputedFields,
  JournalTrackerSummary,
  WinLossLabel,
} from "./types";

/** Exit Date − Entry Date (calendar days) */
export function calculateDaysHeld(
  entryDate: string,
  exitDate: string
): number {
  const entry = startOfDay(parseISO(entryDate));
  const exit = startOfDay(parseISO(exitDate));
  return Math.max(0, differenceInCalendarDays(exit, entry));
}

/** Credit Received − Exit Debit (total dollars) */
export function calculateJournalProfitLoss(
  creditReceived: number,
  exitDebit: number
): number {
  return creditReceived - exitDebit;
}

/** (Profit/Loss ÷ Maximum Risk) × 100 */
export function calculateJournalReturnOnRiskPct(
  profitLoss: number,
  maxRisk: number
): number {
  if (maxRisk <= 0) return 0;
  return (profitLoss / maxRisk) * 100;
}

export function calculateWinLoss(profitLoss: number): WinLossLabel {
  return profitLoss > 0 ? "Win" : "Loss";
}

export function buildJournalComputedFields(input: {
  entryDate: string;
  exitDate: string | null;
  creditReceived: number | null;
  exitDebit: number | null;
  maxRisk: number | null;
}): JournalComputedFields {
  if (
    input.exitDate == null ||
    input.creditReceived == null ||
    input.exitDebit == null
  ) {
    return {
      daysHeld: null,
      profitLoss: null,
      returnOnRiskPct: null,
      winLoss: null,
    };
  }

  const daysHeld = calculateDaysHeld(input.entryDate, input.exitDate);
  const profitLoss = calculateJournalProfitLoss(
    input.creditReceived,
    input.exitDebit
  );
  const returnOnRiskPct =
    input.maxRisk != null
      ? calculateJournalReturnOnRiskPct(profitLoss, input.maxRisk)
      : null;

  return {
    daysHeld,
    profitLoss,
    returnOnRiskPct,
    winLoss: calculateWinLoss(profitLoss),
  };
}

export function buildJournalTrackerSummary(
  entries: EnrichedJournalEntry[]
): JournalTrackerSummary {
  const closed = entries.filter((e) => e.isClosed && e.myProfitLoss != null);
  const wins = closed.filter((e) => (e.myProfitLoss ?? 0) > 0);
  const losses = closed.filter((e) => (e.myProfitLoss ?? 0) <= 0);

  const grossProfit = wins.reduce((s, e) => s + (e.myProfitLoss ?? 0), 0);
  const grossLoss = Math.abs(
    losses.reduce((s, e) => s + (e.myProfitLoss ?? 0), 0)
  );
  const myNetProfitLoss = closed.reduce((s, e) => s + (e.myProfitLoss ?? 0), 0);
  const clientNetProfitLoss = closed.reduce(
    (s, e) => s + (e.clientProfitLoss ?? 0),
    0
  );
  const netProfitLoss = myNetProfitLoss;

  const profitFactor =
    grossLoss > 0 ? grossProfit / grossLoss : grossProfit > 0 ? null : null;

  const avgDays =
    closed.length > 0
      ? closed.reduce((s, e) => s + (e.daysHeld ?? 0), 0) / closed.length
      : 0;

  return {
    totalTrades: entries.length,
    closedTrades: closed.length,
    winRate: closed.length > 0 ? (wins.length / closed.length) * 100 : 0,
    netProfitLoss,
    myNetProfitLoss,
    clientNetProfitLoss,
    averageWin: wins.length > 0 ? grossProfit / wins.length : 0,
    averageLoss:
      losses.length > 0
        ? losses.reduce((s, e) => s + (e.myProfitLoss ?? 0), 0) / losses.length
        : 0,
    profitFactor,
    averageDaysHeld: avgDays,
  };
}
