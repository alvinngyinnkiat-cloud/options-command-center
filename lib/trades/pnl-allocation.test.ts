import { describe, expect, it } from "vitest";
import {
  buildPortfolioPnlBreakdown,
  calculateClientOutstanding,
  calculateClientPnL,
  calculateMyPnL,
  calculatePortfolioPersonalPnL,
  calculateTotalTradePnL,
  calculateTradePnlAllocation,
} from "./pnl-allocation";
import type { EnrichedTrade } from "./types";

function mockTrade(
  overrides: Partial<EnrichedTrade> & {
    currentPnl: number;
    realizedPnl?: number | null;
  }
): EnrichedTrade {
  const status = overrides.status ?? "open";
  return {
    id: "t1",
    watchlistId: "w1",
    ticker: "SPY",
    strategy: "bull_put_spread",
    strategyLabel: "Bull Put Spread",
    status,
    statusLabel: status,
    entryDate: "2026-06-01",
    expirationDate: "2026-06-20",
    contracts: 1,
    premiumPerContract: 2,
    currentValue: 80,
    currentOptionValue: 0.8,
    manualCurrentOptionValue: null,
    systemCurrentOptionValue: 0.8,
    currentValueSource: "system",
    currentValueUpdatedAt: null,
    valueDifference: null,
    exitDebit: null,
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
    manualSupport: null,
    manualResistance: null,
    atr14: null,
    calculations: {
      width: 5,
      totalPremiumReceived: 200,
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
      breakevenNearestSide: null,
      breakevenSafetyStatus: null,
      takeProfitPrice: 150,
      takeProfitClosePrice: 0.49,
      takeProfitNetOfFees: 0.5,
      stopLossPrice: 350,
      profitTargetAmount: 150,
      stopLossAmount: 350,
      currentOptionValuePerContract: 0.8,
      currentCloseCost: 80,
      currentPnl: overrides.currentPnl,
      realizedPnl:
        overrides.realizedPnl !== undefined
          ? overrides.realizedPnl
          : status === "closed"
            ? overrides.currentPnl
            : null,
      takeProfitReached: false,
      stopLossWarning: false,
    },
    alerts: [],
    suggestedAction: "Hold",
    journalEntryCount: 0,
    tradeOwnership: overrides.tradeOwnership ?? "personal",
    clientId: overrides.clientId ?? null,
    clientName: null,
    myProfitSharePercent: overrides.myProfitSharePercent ?? 60,
    clientProfitSharePercent: overrides.clientProfitSharePercent ?? 40,
    isClientTrade: overrides.isClientTrade ?? false,
    createdAt: "",
    updatedAt: "",
    ...overrides,
  } as EnrichedTrade;
}

describe("pnl allocation", () => {
  it("personal trade assigns 100% to my P/L", () => {
    const trade = mockTrade({ currentPnl: 100 });
    expect(calculateTotalTradePnL(trade)).toBe(100);
    expect(calculateMyPnL(trade, 100)).toBe(100);
    expect(calculateClientPnL(trade, 100)).toBe(0);
  });

  it("client profit sharing splits profit 60/40", () => {
    const trade = mockTrade({
      currentPnl: 100,
      tradeOwnership: "client_profit_sharing",
      isClientTrade: true,
    });
    expect(calculateMyPnL(trade, 100)).toBe(60);
    expect(calculateClientPnL(trade, 100)).toBe(40);
  });

  it("client profit sharing splits loss 60/40", () => {
    const trade = mockTrade({
      currentPnl: -100,
      tradeOwnership: "client_profit_sharing",
      isClientTrade: true,
    });
    expect(calculateMyPnL(trade, -100)).toBe(-60);
    expect(calculateClientPnL(trade, -100)).toBe(-40);
  });

  it("portfolio personal P/L excludes full client share", () => {
    const trades = [
      mockTrade({ currentPnl: 200 }),
      mockTrade({
        currentPnl: 100,
        tradeOwnership: "client_profit_sharing",
        isClientTrade: true,
      }),
    ];
    expect(calculatePortfolioPersonalPnL(trades)).toBe(260);
  });

  it("client outstanding is open client share only", () => {
    const trades = [
      mockTrade({
        currentPnl: 100,
        tradeOwnership: "client_profit_sharing",
        isClientTrade: true,
      }),
      mockTrade({
        currentPnl: 50,
        status: "closed",
        tradeOwnership: "client_profit_sharing",
        isClientTrade: true,
        realizedPnl: 50,
      }),
    ];
    expect(calculateClientOutstanding(trades)).toBe(40);
  });

  it("builds portfolio breakdown", () => {
    const breakdown = buildPortfolioPnlBreakdown([
      mockTrade({ currentPnl: 120 }),
      mockTrade({
        currentPnl: 100,
        tradeOwnership: "client_profit_sharing",
        isClientTrade: true,
      }),
    ]);
    expect(breakdown.myOpenPnl).toBe(180);
    expect(breakdown.clientOpenPnl).toBe(40);
    expect(breakdown.clientPnlOwed).toBe(40);
  });

  it("calculateTradePnlAllocation bundles all fields", () => {
    const alloc = calculateTradePnlAllocation(
      mockTrade({
        currentPnl: 100,
        tradeOwnership: "client_profit_sharing",
        isClientTrade: true,
      })
    );
    expect(alloc).toEqual({
      totalTradePnl: 100,
      myPnl: 60,
      clientPnl: 40,
    });
  });
});
