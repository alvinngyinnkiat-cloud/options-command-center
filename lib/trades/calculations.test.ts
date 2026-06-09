import { describe, expect, it } from "vitest";
import {
  buildTradeCalculations,
  calculateBreakeven,
  calculateDte,
  calculateMaxRisk,
  calculateRealizedPnl,
  calculateSpreadWidth,
  calculateStopLossPrice,
  calculateTakeProfitClosePrice,
  calculateTakeProfitNetOfFees,
  calculateTakeProfitPrice,
  calculateTotalPremiumReceived,
} from "./calculations";

const bullStrikes = {
  shortStrikePut: 500,
  longStrikePut: 495,
  shortStrikeCall: null,
  longStrikeCall: null,
};

describe("trade calculations", () => {
  it("calculates DTE from expiry", () => {
    const dte = calculateDte("2026-06-20", new Date("2026-06-06T12:00:00"));
    expect(dte).toBe(14);
  });

  it("calculates bull put width", () => {
    expect(calculateSpreadWidth("bull_put_spread", bullStrikes)).toBe(5);
  });

  it("calculates total premium received", () => {
    expect(calculateTotalPremiumReceived(2.5, 2)).toBe(500);
  });

  it("calculates max risk", () => {
    expect(calculateMaxRisk(5, 2, 500)).toBe(500);
  });

  it("calculates bull put breakeven", () => {
    const be = calculateBreakeven("bull_put_spread", bullStrikes, 2.5);
    expect(be.put).toBe(497.5);
  });

  it("calculates bear call breakeven", () => {
    const be = calculateBreakeven(
      "bear_call_spread",
      {
        shortStrikePut: null,
        longStrikePut: null,
        shortStrikeCall: 520,
        longStrikeCall: 525,
      },
      1.8
    );
    expect(be.call).toBe(521.8);
  });

  it("calculates iron condor breakevens", () => {
    const be = calculateBreakeven(
      "iron_condor",
      {
        shortStrikePut: 490,
        longStrikePut: 485,
        shortStrikeCall: 510,
        longStrikeCall: 515,
      },
      3
    );
    expect(be.put).toBe(487);
    expect(be.call).toBe(513);
  });

  it("calculates take profit at 75% of premium", () => {
    expect(calculateTakeProfitPrice(400)).toBe(300);
  });

  it.each([
    { premium: 1.0, close: 0.24, net: 0.25 },
    { premium: 1.2, close: 0.29, net: 0.3 },
    { premium: 1.5, close: 0.365, net: 0.375 },
    { premium: 2.0, close: 0.49, net: 0.5 },
  ])(
    "calculates TP close price for premium $premium",
    ({ premium, close, net }) => {
      expect(calculateTakeProfitClosePrice(premium)).toBe(close);
      expect(calculateTakeProfitNetOfFees(premium)).toBe(net);
    }
  );

  it("calculates TP at 75% with full precision for fractional premium", () => {
    expect(calculateTakeProfitNetOfFees(1.0096)).toBeCloseTo(0.2524, 4);
    expect(calculateTakeProfitClosePrice(1.0096)).toBeCloseTo(0.2424, 4);
  });

  it("never allows TP close price below 0.01", () => {
    expect(calculateTakeProfitClosePrice(0.02)).toBe(0.01);
    expect(calculateTakeProfitClosePrice(0)).toBe(0.01);
  });

  it("calculates stop loss at 175% of premium", () => {
    expect(calculateStopLossPrice(400)).toBe(700);
  });

  it("calculates realized P/L", () => {
    expect(calculateRealizedPnl(500, 150)).toBe(350);
  });

  it("calculates sell put breakeven and max risk", () => {
    const be = calculateBreakeven(
      "sell_put",
      {
        shortStrikePut: 480,
        longStrikePut: null,
        shortStrikeCall: null,
        longStrikeCall: null,
      },
      2.5
    );
    expect(be.put).toBe(477.5);

    const calc = buildTradeCalculations({
      strategy: "sell_put",
      expirationDate: "2026-06-20",
      contracts: 2,
      premiumPerContract: 2.5,
      currentOptionValuePerContract: 1,
      exitDebit: null,
      status: "open",
      takeProfitTargetPct: 75,
      stopLossTargetPct: 175,
      sellCallCoverage: "covered",
      strikes: {
        shortStrikePut: 480,
        longStrikePut: null,
        shortStrikeCall: null,
        longStrikeCall: null,
      },
    });
    expect(calc.cashRequired).toBe(96000);
    expect(calc.maxRisk).toBe(95500);
    expect(calc.breakevenPut).toBe(477.5);
  });

  it("calculates covered sell call and flags naked unlimited risk", () => {
    const be = calculateBreakeven(
      "sell_call",
      {
        shortStrikePut: null,
        longStrikePut: null,
        shortStrikeCall: 520,
        longStrikeCall: null,
      },
      1.8
    );
    expect(be.call).toBe(521.8);

    const covered = buildTradeCalculations({
      strategy: "sell_call",
      expirationDate: "2026-06-20",
      contracts: 1,
      premiumPerContract: 1.8,
      currentOptionValuePerContract: 0.5,
      exitDebit: null,
      status: "open",
      takeProfitTargetPct: 75,
      stopLossTargetPct: 175,
      sellCallCoverage: "covered",
      strikes: {
        shortStrikePut: null,
        longStrikePut: null,
        shortStrikeCall: 520,
        longStrikeCall: null,
      },
    });
    expect(covered.requiredShares).toBe(100);
    expect(covered.maxRisk).toBe(51820);
    expect(covered.unlimitedRisk).toBe(false);

    const naked = buildTradeCalculations({
      strategy: "sell_call",
      expirationDate: "2026-06-20",
      contracts: 1,
      premiumPerContract: 1.8,
      currentOptionValuePerContract: 0.5,
      exitDebit: null,
      status: "open",
      takeProfitTargetPct: 75,
      stopLossTargetPct: 175,
      sellCallCoverage: "naked",
      strikes: {
        shortStrikePut: null,
        longStrikePut: null,
        shortStrikeCall: 520,
        longStrikeCall: null,
      },
    });
    expect(naked.unlimitedRisk).toBe(true);
    expect(naked.maxRisk).toBe(0);
  });

  it("builds full trade calculations", () => {
    const calc = buildTradeCalculations(
      {
        strategy: "bull_put_spread",
        expirationDate: "2026-06-20",
        contracts: 1,
        premiumPerContract: 2,
        currentOptionValuePerContract: 0.8,
        exitDebit: null,
        status: "open",
        takeProfitTargetPct: 75,
        stopLossTargetPct: 175,
        sellCallCoverage: "covered",
        strikes: {
          shortStrikePut: 500,
          longStrikePut: 495,
          shortStrikeCall: null,
          longStrikeCall: null,
        },
      },
      new Date("2026-06-06T12:00:00")
    );
    expect(calc.totalPremiumReceived).toBe(200);
    expect(calc.maxRisk).toBe(300);
    expect(calc.currentCloseCost).toBe(80);
    expect(calc.currentPnl).toBe(120);
    expect(calc.currentPnlPct).toBeCloseTo(40, 0);
    expect(calc.takeProfitClosePrice).toBe(0.49);
    expect(calc.takeProfitNetOfFees).toBe(0.5);
    expect(calc.breakevenSafetyDistancePct).toBeNull();
  });

  it("includes breakeven safety when stock price is provided", () => {
    const calc = buildTradeCalculations({
      strategy: "bull_put_spread",
      expirationDate: "2026-06-20",
      contracts: 1,
      premiumPerContract: 2,
      currentOptionValuePerContract: 0.8,
      underlyingCurrentPrice: 510,
      exitDebit: null,
      status: "open",
      takeProfitTargetPct: 75,
      stopLossTargetPct: 175,
      sellCallCoverage: "covered",
      strikes: {
        shortStrikePut: 500,
        longStrikePut: 495,
        shortStrikeCall: null,
        longStrikeCall: null,
      },
    });
    expect(calc.breakevenPrice).toBe(498);
    expect(calc.breakevenSafetyDistance).toBe(12);
    expect(calc.breakevenSafetyDistancePct).toBeCloseTo(2.35, 1);
    expect(calc.breakevenSafetyStatus).toBe("Caution");
  });
});
