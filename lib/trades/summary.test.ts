import { describe, expect, it } from "vitest";
import { buildTradeTrackerSummary } from "./summary";
import type { EnrichedTrade } from "./types";

function mockTrade(
  overrides: Partial<EnrichedTrade> & {
    id: string;
    status: EnrichedTrade["status"];
    totalPremiumReceived: number;
  }
): EnrichedTrade {
  const status = overrides.status;
  return {
    id: overrides.id,
    watchlistId: "w1",
    ticker: overrides.ticker ?? "SPY",
    strategy: "bull_put_spread",
    strategyLabel: "Bull Put Spread",
    status,
    statusLabel: status,
    entryDate: "2026-06-01",
    expirationDate: "2026-06-20",
    contracts: 1,
    premiumPerContract: overrides.totalPremiumReceived / 100,
    currentValue: 0,
    currentOptionValue: null,
    manualCurrentOptionValue: null,
    systemCurrentOptionValue: 0,
    currentValueSource: "manual",
    currentValueUpdatedAt: null,
    valueDifference: null,
    exitDebit: status === "closed" ? 0 : null,
    exitDebitPerContract: status === "closed" ? 0 : null,
    feesCommission: 0,
    brokerRealizedPnl: null,
    strikes: {
      shortStrikePut: 500,
      longStrikePut: 495,
      shortStrikeCall: null,
      longStrikeCall: null,
    },
    strikesDisplay: "500/495",
    takeProfitTargetPct: 75,
    stopLossTargetPct: 175,
    tradeScore: null,
    recommendedStrategy: null,
    confidenceLevel: null,
    reasonForEntry: null,
    notes: null,
    underlyingAveragePrice: null,
    underlyingCurrentPrice: null,
    underlyingPriceSource: "unavailable",
    underlyingPriceUpdatedAt: null,
    underlyingPriceUsable: false,
    manualSupport: null,
    manualResistance: null,
    atr14: null,
    calculations: {
      width: 5,
      totalPremiumReceived: overrides.totalPremiumReceived,
      maxRisk: 300,
      buyingPowerUsed: 300,
      returnOnRiskPct: 40,
      currentPnlPct: 40,
      dte: 14,
      breakevenPut: 498,
      breakevenCall: null,
      breakevenDisplay: "498",
      breakevenPrice: 498,
      breakevenPutPrice: 498,
      breakevenCallPrice: null,
      breakevenSafetyDistance: null,
      breakevenSafetyDistancePct: null,
      breakevenPutDistancePct: null,
      breakevenCallDistancePct: null,
      breakevenNearestSide: null,
      breakevenSafetyStatus: null,
      takeProfitPrice: 150,
      takeProfitClosePrice: 0.49,
      takeProfitNetOfFees: 0.5,
      stopLossPrice: 350,
      profitTargetAmount: 150,
      stopLossAmount: 350,
      currentOptionValuePerContract: 0,
      currentCloseCost: 0,
      currentPnl: overrides.totalPremiumReceived,
      calculatedRealizedPnl:
        status === "closed" ? overrides.totalPremiumReceived : null,
      realizedPnl: status === "closed" ? overrides.totalPremiumReceived : null,
      takeProfitReached: false,
      stopLossWarning: false,
    },
    alerts: [],
    suggestedAction: null,
    journalEntryCount: 0,
    tradeOwnership: "personal",
    clientId: null,
    clientName: null,
    myProfitSharePercent: 60,
    clientProfitSharePercent: 40,
    isClientTrade: false,
    sellCallCoverage: "covered",
    sharesOwned: null,
    parentTradeId: null,
    originalCost: null,
    createdAt: "2026-06-01T00:00:00.000Z",
    updatedAt: "2026-06-01T00:00:00.000Z",
    pnlAllocation: { totalTradePnl: 0, myPnl: 0, clientPnl: 0 },
  };
}

describe("buildTradeTrackerSummary", () => {
  it("sums premium from open and closed trades", () => {
    const open = mockTrade({
      id: "open-1",
      status: "open",
      totalPremiumReceived: 101,
    });
    const closed = mockTrade({
      id: "closed-1",
      status: "closed",
      totalPremiumReceived: 113,
    });

    const summary = buildTradeTrackerSummary([open, closed]);

    expect(summary.openTrades).toBe(1);
    expect(summary.closedTrades).toBe(1);
    expect(summary.totalPremiumCollected).toBe(214);
  });

  it("includes managed and closing trades in premium total", () => {
    const managed = mockTrade({
      id: "managed-1",
      status: "managed",
      totalPremiumReceived: 50,
    });
    const closing = mockTrade({
      id: "closing-1",
      status: "closing",
      totalPremiumReceived: 40,
    });
    const closed = mockTrade({
      id: "closed-1",
      status: "closed",
      totalPremiumReceived: 113,
    });

    const summary = buildTradeTrackerSummary([managed, closing, closed]);

    expect(summary.totalPremiumCollected).toBe(203);
  });
});
