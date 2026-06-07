import { describe, expect, it } from "vitest";
import {
  buildClientProfitSharingSummary,
  splitTradeProfit,
} from "./calculations";
import type { ClientProfile, TradeAllocationRow } from "./types";

const clients: ClientProfile[] = [
  {
    id: "c1",
    clientName: "Test",
    capitalContributed: 50_000,
    clientSharePct: 40,
    mySharePct: 60,
    totalPaidToClient: 100,
    notes: null,
    createdAt: "",
    updatedAt: "",
  },
];

const rows: TradeAllocationRow[] = [
  {
    allocationId: "a1",
    tradeId: "t1",
    clientId: "c1",
    ticker: "SPY",
    strategyLabel: "Iron Condor",
    statusLabel: "Open",
    entryDate: "2026-06-01",
    exitDate: null,
    includedInPool: true,
    tradeProfit: 500,
    clientSharePct: 40,
    mySharePct: 60,
    clientProfit: 200,
    myProfit: 300,
    allocationStatus: "Open",
    paymentLabel: "—",
  },
  {
    allocationId: "a2",
    tradeId: "t2",
    clientId: "c1",
    ticker: "QQQ",
    strategyLabel: "Bull Put",
    statusLabel: "Closed",
    entryDate: "2026-06-01",
    exitDate: "2026-06-05",
    includedInPool: true,
    tradeProfit: -100,
    clientSharePct: 40,
    mySharePct: 60,
    clientProfit: -40,
    myProfit: -60,
    allocationStatus: "Unpaid",
    paymentLabel: "Unpaid",
  },
];

describe("client profit sharing", () => {
  it("splits trade profit 40/60", () => {
    const split = splitTradeProfit(1_000, 40, 60);
    expect(split.clientProfit).toBe(400);
    expect(split.myProfit).toBe(600);
  });

  it("builds summary with outstanding balance and owed shares", () => {
    const summary = buildClientProfitSharingSummary(clients, rows);
    expect(summary.totalClientCapital).toBe(50_000);
    expect(summary.allocatedTradesCount).toBe(2);
    expect(summary.lifetimeClientShare).toBe(160);
    expect(summary.outstandingAmountOwed).toBe(60);
    expect(summary.clientShareOwed).toBe(-40);
    expect(summary.totalClientProfit).toBe(200);
    expect(summary.totalClientLoss).toBe(40);
  });
});
