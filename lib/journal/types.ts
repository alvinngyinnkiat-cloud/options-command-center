import type { DataSource } from "@/lib/portfolio/types";
import type { StrategyType } from "@/types/database";

export type ExitReason =
  | "75% Profit Target"
  | "Expired Worthless"
  | "Early Profit Taking"
  | "Manual Exit";

export type WinLossLabel = "Win" | "Loss";

export interface JournalFormInput {
  tradeId: string | null;
  ticker: string;
  entryDate: string;
  strategy: StrategyType | null;
  dte: number | null;
  contracts: number | null;
  shortStrike: number | null;
  longStrike: number | null;
  width: number | null;
  creditReceived: number | null;
  breakeven: number | null;
  maxRisk: number | null;
  buyingPowerUsed: number | null;
  tradeScore: number | null;
  confidenceLevel: string | null;
  reasonForEntry: string | null;
  exitDate: string | null;
  exitDebit: number | null;
  exitReason: ExitReason | null;
  lessonLearned: string | null;
  entrySetup: string | null;
  exitOutcome: string | null;
  whatWentWell: string | null;
  whatToImprove: string | null;
  reviewNotes: string | null;
  screenshotUrl: string | null;
  tags: string[];
}

export interface JournalComputedFields {
  daysHeld: number | null;
  profitLoss: number | null;
  returnOnRiskPct: number | null;
  winLoss: WinLossLabel | null;
}

export interface EnrichedJournalEntry {
  id: string;
  tradeId: string | null;
  ticker: string;
  title: string;
  entryDate: string;
  strategy: StrategyType | null;
  strategyLabel: string;
  dte: number | null;
  contracts: number | null;
  shortStrike: number | null;
  longStrike: number | null;
  width: number | null;
  creditReceived: number | null;
  breakeven: number | null;
  maxRisk: number | null;
  buyingPowerUsed: number | null;
  tradeScore: number | null;
  confidenceLevel: string | null;
  reasonForEntry: string | null;
  exitDate: string | null;
  exitDebit: number | null;
  daysHeld: number | null;
  profitLoss: number | null;
  totalTradeProfitLoss: number | null;
  myProfitLoss: number | null;
  clientProfitLoss: number | null;
  returnOnRiskPct: number | null;
  winLoss: WinLossLabel | null;
  exitReason: ExitReason | null;
  lessonLearned: string | null;
  entrySetup: string | null;
  exitOutcome: string | null;
  whatWentWell: string | null;
  whatToImprove: string | null;
  reviewNotes: string | null;
  screenshotUrl: string | null;
  tags: string[];
  isClosed: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface JournalTrackerSummary {
  totalTrades: number;
  closedTrades: number;
  winRate: number;
  netProfitLoss: number;
  myNetProfitLoss: number;
  clientNetProfitLoss: number;
  averageWin: number;
  averageLoss: number;
  profitFactor: number | null;
  averageDaysHeld: number;
}

export interface JournalTrackerData {
  entries: EnrichedJournalEntry[];
  summary: JournalTrackerSummary;
  dataSource: DataSource;
}

export type JournalActionResult =
  | { success: true; data: JournalTrackerData }
  | { success: false; error: string };
