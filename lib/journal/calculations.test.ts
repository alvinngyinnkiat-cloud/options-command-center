import { describe, expect, it } from "vitest";
import {
  buildJournalComputedFields,
  buildJournalTrackerSummary,
  calculateDaysHeld,
  calculateJournalProfitLoss,
  calculateJournalReturnOnRiskPct,
  calculateWinLoss,
} from "./calculations";
import type { EnrichedJournalEntry } from "./types";

describe("journal calculations", () => {
  it("calculates days held", () => {
    expect(calculateDaysHeld("2026-06-01", "2026-06-15")).toBe(14);
  });

  it("calculates profit/loss", () => {
    expect(calculateJournalProfitLoss(500, 150)).toBe(350);
    expect(calculateJournalProfitLoss(200, 250)).toBe(-50);
  });

  it("calculates return on risk", () => {
    expect(calculateJournalReturnOnRiskPct(350, 1000)).toBe(35);
  });

  it("determines win/loss", () => {
    expect(calculateWinLoss(10)).toBe("Win");
    expect(calculateWinLoss(0)).toBe("Loss");
    expect(calculateWinLoss(-5)).toBe("Loss");
  });

  it("builds computed fields when exit present", () => {
    const c = buildJournalComputedFields({
      entryDate: "2026-06-01",
      exitDate: "2026-06-10",
      creditReceived: 400,
      exitDebit: 100,
      maxRisk: 800,
    });
    expect(c.daysHeld).toBe(9);
    expect(c.profitLoss).toBe(300);
    expect(c.returnOnRiskPct).toBe(37.5);
    expect(c.winLoss).toBe("Win");
  });

  it("builds tracker summary", () => {
    const entries: EnrichedJournalEntry[] = [
      {
        id: "1",
        tradeId: null,
        ticker: "SPY",
        title: "SPY",
        entryDate: "2026-06-01",
        strategy: "bull_put_spread",
        strategyLabel: "Bull Put",
        dte: null,
        contracts: 1,
        shortStrike: null,
        longStrike: null,
        width: null,
        creditReceived: 300,
        breakeven: null,
        maxRisk: 500,
        buyingPowerUsed: null,
        tradeScore: null,
        confidenceLevel: null,
        reasonForEntry: "test",
        exitDate: "2026-06-10",
        exitDebit: 100,
        daysHeld: 9,
        profitLoss: 200,
        totalTradeProfitLoss: 200,
        myProfitLoss: 200,
        clientProfitLoss: 0,
        returnOnRiskPct: 40,
        winLoss: "Win",
        exitReason: "75% Profit Target",
        lessonLearned: "good",
        entrySetup: null,
        exitOutcome: null,
        whatWentWell: null,
        whatToImprove: null,
        reviewNotes: null,
        screenshotUrl: null,
        tags: [],
        isClosed: true,
        createdAt: "",
        updatedAt: "",
      },
      {
        id: "2",
        tradeId: null,
        ticker: "QQQ",
        title: "QQQ",
        entryDate: "2026-06-01",
        strategy: "bear_call_spread",
        strategyLabel: "Bear Call",
        dte: null,
        contracts: 1,
        shortStrike: null,
        longStrike: null,
        width: null,
        creditReceived: 200,
        breakeven: null,
        maxRisk: 400,
        buyingPowerUsed: null,
        tradeScore: null,
        confidenceLevel: null,
        reasonForEntry: "test",
        exitDate: "2026-06-08",
        exitDebit: 300,
        daysHeld: 7,
        profitLoss: -100,
        totalTradeProfitLoss: -100,
        myProfitLoss: -100,
        clientProfitLoss: 0,
        returnOnRiskPct: -25,
        winLoss: "Loss",
        exitReason: "Manual Exit",
        lessonLearned: "bad",
        entrySetup: null,
        exitOutcome: null,
        whatWentWell: null,
        whatToImprove: null,
        reviewNotes: null,
        screenshotUrl: null,
        tags: [],
        isClosed: true,
        createdAt: "",
        updatedAt: "",
      },
    ];
    const s = buildJournalTrackerSummary(entries);
    expect(s.totalTrades).toBe(2);
    expect(s.winRate).toBe(50);
    expect(s.netProfitLoss).toBe(100);
    expect(s.myNetProfitLoss).toBe(100);
    expect(s.profitFactor).toBe(2);
  });
});
