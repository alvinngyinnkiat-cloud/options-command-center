import { describe, expect, it } from "vitest";
import {
  buildCloseTradePreviewWithFees,
  buildClosedTradePnlBreakdown,
  resolveFinalRealizedPnl,
} from "./realized-pnl";
import { calculateRealizedPnl } from "./calculations";

describe("closed trade realized P/L", () => {
  it("subtracts fees from premium minus closing debit", () => {
    expect(calculateRealizedPnl(113.51, 51, 0.49)).toBeCloseTo(62.02, 2);
  });

  it("uses broker override when provided", () => {
    expect(
      resolveFinalRealizedPnl({
        calculatedRealizedPnl: 62.51,
        brokerRealizedPnl: 62.02,
      })
    ).toBe(62.02);
  });

  it("builds close preview with fees", () => {
    const preview = buildCloseTradePreviewWithFees({
      premiumPerContract: 1.1351,
      contracts: 1,
      exitDebitPerContract: 0.514,
      feesCommission: 0.49,
    });
    expect(preview.premiumReceived).toBeCloseTo(113.51, 2);
    expect(preview.exitDebitTotal).toBeCloseTo(51.4, 2);
    expect(preview.calculatedRealizedPnl).toBeCloseTo(61.61, 2);
  });

  it("builds breakdown with broker override", () => {
    const breakdown = buildClosedTradePnlBreakdown({
      premiumPerContract: 1.1351,
      contracts: 1,
      exitDebitTotal: 51.4,
      feesCommission: 0.49,
      brokerRealizedPnl: 62.02,
    });
    expect(breakdown.calculatedRealizedPnl).toBeCloseTo(61.61, 2);
    expect(breakdown.finalRealizedPnl).toBe(62.02);
  });
});
