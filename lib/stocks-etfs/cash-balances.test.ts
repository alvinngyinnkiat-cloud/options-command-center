import { describe, expect, it } from "vitest";
import {
  applyCashDelta,
  calculateLedgerNetAmount,
  calculateTotalFeesPaid,
  cashByCategory,
  defaultCashBalances,
} from "./cash-balances";

describe("stock etf cash balances", () => {
  it("defaults three market buckets with correct currencies", () => {
    const rows = defaultCashBalances("user-1");
    const map = cashByCategory(rows);
    expect(map.us_etf).toBe(0);
    expect(map.us_stock).toBe(0);
    expect(map.sg_stock).toBe(0);
    expect(rows.find((r) => r.market_category === "us_etf")?.currency).toBe("USD");
    expect(rows.find((r) => r.market_category === "sg_stock")?.currency).toBe("SGD");
  });

  it("calculates ledger net amounts with fees", () => {
    expect(
      calculateLedgerNetAmount({
        transactionType: "buy",
        amountNative: 1000,
        feeNative: 5,
      })
    ).toBe(-1005);
    expect(
      calculateLedgerNetAmount({
        transactionType: "sell",
        amountNative: 1000,
        feeNative: 5,
      })
    ).toBe(995);
    expect(
      calculateLedgerNetAmount({
        transactionType: "monthly_contribution",
        amountNative: 500,
        feeNative: 0,
      })
    ).toBe(500);
  });

  it("sums fees paid across ledger entries", () => {
    expect(
      calculateTotalFeesPaid([
        { fee_native: 2.5 },
        { fee_native: 1.5 },
      ])
    ).toBe(4);
  });

  it("does not allow cash below zero", () => {
    expect(applyCashDelta(100, -150)).toBe(0);
    expect(applyCashDelta(100, 50)).toBe(150);
  });
});
