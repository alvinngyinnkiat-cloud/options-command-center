import { describe, expect, it } from "vitest";
import {
  buildCloseTradePreview,
  calculateExitDebitTotal,
  deriveExitDebitPerContract,
  resolveStoredExitDebitTotal,
} from "./exit-debit";
import { buildTradeCalculations } from "./calculations";

describe("exit debit semantics", () => {
  it("calculates total closing cost from per-contract debit", () => {
    expect(calculateExitDebitTotal(0.514, 1)).toBeCloseTo(51.4, 2);
    expect(calculateExitDebitTotal(0.55, 2)).toBeCloseTo(110, 2);
  });

  it("derives per-contract debit from stored total", () => {
    expect(deriveExitDebitPerContract(51.4, 1)).toBeCloseTo(0.514, 4);
    expect(deriveExitDebitPerContract(110, 2)).toBeCloseTo(0.55, 4);
  });

  it("normalizes legacy per-contract values stored in exit_debit", () => {
    expect(resolveStoredExitDebitTotal(0.514, 1.1351, 1)).toBeCloseTo(51.4, 2);
    expect(resolveStoredExitDebitTotal(110, 2.1, 2)).toBe(110);
  });

  it("builds XSP close preview: premium 113.51, debit 0.514, net ~62.11", () => {
    const preview = buildCloseTradePreview({
      premiumPerContract: 1.1351,
      contracts: 1,
      exitDebitPerContract: 0.514,
    });

    expect(preview.premiumReceived).toBeCloseTo(113.51, 2);
    expect(preview.exitDebitTotal).toBeCloseTo(51.4, 2);
    expect(preview.estimatedRealizedPnl).toBeCloseTo(62.11, 2);
  });

  it("realized P/L uses total exit debit for closed credit spreads", () => {
    const calc = buildTradeCalculations({
      strategy: "bull_put_spread",
      expirationDate: "2026-06-20",
      contracts: 1,
      premiumPerContract: 1.1351,
      currentOptionValuePerContract: 0,
      exitDebit: 51.4,
      status: "closed",
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

    expect(calc.totalPremiumReceived).toBeCloseTo(113.51, 2);
    expect(calc.realizedPnl).toBeCloseTo(62.11, 2);
  });

  it("repairs legacy stored per-contract exit_debit on read", () => {
    const calc = buildTradeCalculations({
      strategy: "bull_put_spread",
      expirationDate: "2026-06-20",
      contracts: 1,
      premiumPerContract: 1.1351,
      currentOptionValuePerContract: 0,
      exitDebit: resolveStoredExitDebitTotal(0.514, 1.1351, 1),
      status: "closed",
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

    expect(calc.realizedPnl).toBeCloseTo(62.11, 2);
  });
});
