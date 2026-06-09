import { describe, expect, it } from "vitest";
import type { EnrichedTrade } from "./types";
import {
  DEFAULT_TRADE_SORT,
  sortTrades,
  toggleTradeSort,
} from "./sort-trades";

function mockTrade(
  overrides: Partial<EnrichedTrade> & { id: string; expirationDate: string }
): EnrichedTrade {
  return {
    id: overrides.id,
    watchlistId: "w1",
    ticker: overrides.ticker ?? overrides.id,
    strategy: "bull_put_spread",
    strategyLabel: overrides.strategyLabel ?? "Bull Put Spread",
    status: overrides.status ?? "open",
    statusLabel: overrides.status ?? "open",
    entryDate: "2026-06-01",
    expirationDate: overrides.expirationDate,
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
    exitDebitPerContract: null,
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
      totalPremiumReceived: 200,
      maxRisk: 300,
      buyingPowerUsed: 300,
      returnOnRiskPct: 40,
      currentPnlPct: 10,
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
      currentOptionValuePerContract: 0.8,
      currentCloseCost: 80,
      currentPnl: 120,
      calculatedRealizedPnl: null,
      realizedPnl: null,
      takeProfitReached: false,
      stopLossWarning: false,
      cashRequired: null,
      requiredShares: null,
      unlimitedRisk: false,
    },
    pnlAllocation: { totalTradePnl: 120, myPnl: 120, clientPnl: 0 },
    alerts: [],
    suggestedAction: "Hold",
    journalEntryCount: 0,
    tradeOwnership: "personal",
    clientId: null,
    clientName: null,
    myProfitSharePercent: 100,
    clientProfitSharePercent: 0,
    isClientTrade: false,
    sellCallCoverage: "covered",
    sharesOwned: null,
    parentTradeId: null,
    originalCost: null,
    createdAt: "2026-06-01T00:00:00Z",
    updatedAt: overrides.updatedAt ?? "2026-06-01T00:00:00Z",
  };
}

describe("sortTrades", () => {
  it("sorts open trades by DTE ascending by default", () => {
    const rows = sortTrades(
      [
        mockTrade({ id: "a", ticker: "AAA", expirationDate: "2026-07-01" }),
        mockTrade({ id: "b", ticker: "BBB", expirationDate: "2026-06-15" }),
        mockTrade({ id: "c", ticker: "CCC", expirationDate: "2026-06-20" }),
      ],
      DEFAULT_TRADE_SORT,
      false
    );
    expect(rows.map((r) => r.ticker)).toEqual(["BBB", "CCC", "AAA"]);
  });

  it("toggles DTE sort direction", () => {
    const desc = toggleTradeSort(DEFAULT_TRADE_SORT, "dte");
    expect(desc.direction).toBe("desc");
    const rows = sortTrades(
      [
        mockTrade({ id: "a", ticker: "AAA", expirationDate: "2026-07-01" }),
        mockTrade({ id: "b", ticker: "BBB", expirationDate: "2026-06-15" }),
      ],
      desc,
      false
    );
    expect(rows.map((r) => r.ticker)).toEqual(["AAA", "BBB"]);
  });

  it("puts missing DTE at the bottom when sorting ascending", () => {
    const rows = sortTrades(
      [
        mockTrade({ id: "a", ticker: "AAA", expirationDate: "" }),
        mockTrade({ id: "b", ticker: "BBB", expirationDate: "2026-06-15" }),
      ],
      DEFAULT_TRADE_SORT,
      false
    );
    expect(rows.map((r) => r.ticker)).toEqual(["BBB", "AAA"]);
  });

  it("sorts closed trades by closed date when showing all with default sort", () => {
    const rows = sortTrades(
      [
        mockTrade({
          id: "open",
          ticker: "OPEN",
          expirationDate: "2026-08-01",
          status: "open",
        }),
        mockTrade({
          id: "old",
          ticker: "OLD",
          expirationDate: "2026-05-01",
          status: "closed",
          updatedAt: "2026-05-10T00:00:00Z",
        }),
        mockTrade({
          id: "new",
          ticker: "NEW",
          expirationDate: "2026-05-01",
          status: "closed",
          updatedAt: "2026-06-01T00:00:00Z",
        }),
      ],
      DEFAULT_TRADE_SORT,
      true
    );
    expect(rows.map((r) => r.ticker)).toEqual(["OPEN", "NEW", "OLD"]);
  });
});

describe("toggleTradeSort", () => {
  it("flips direction on same column", () => {
    expect(toggleTradeSort(DEFAULT_TRADE_SORT, "dte").direction).toBe("desc");
    expect(
      toggleTradeSort({ column: "dte", direction: "desc" }, "dte").direction
    ).toBe("asc");
  });
});
