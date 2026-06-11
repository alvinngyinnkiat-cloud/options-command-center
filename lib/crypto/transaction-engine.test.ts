import { describe, expect, it } from "vitest";
import {
  applyBuyToHolding,
  applySellToHolding,
  validateBuyTransaction,
  validateSellTransaction,
  CryptoTransactionError,
} from "./transaction-engine";
import {
  calculateTotalFeesPaid,
  calculateTransactionNetAmount,
} from "./transaction-types";

describe("crypto transaction engine", () => {
  it("blocks buy when cash insufficient", () => {
    expect(() =>
      validateBuyTransaction({
        buyAmountSgd: 100,
        feeSgd: 5,
        availableCashSgd: 50,
      })
    ).toThrow(CryptoTransactionError);
    expect(() =>
      validateBuyTransaction({
        buyAmountSgd: 100,
        feeSgd: 5,
        availableCashSgd: 50,
      })
    ).toThrow("Insufficient Exchange Cash");
  });

  it("blocks sell when amount exceeds position", () => {
    expect(() =>
      validateSellTransaction({ sellAmountSgd: 200, currentValueSgd: 100 })
    ).toThrow("Sell Amount Exceeds Position Value");
  });

  it("buy increases invested and current; fee adds to cost basis", () => {
    const result = applyBuyToHolding(
      { total_invested_sgd: 1000, current_value_sgd: 900 },
      500,
      10
    );
    expect(result.totalInvestedSgd).toBe(1510);
    expect(result.currentValueSgd).toBe(1400);
  });

  it("sell reduces current and cost basis proportionally", () => {
    const result = applySellToHolding(
      { total_invested_sgd: 1000, current_value_sgd: 800 },
      400
    );
    expect(result.currentValueSgd).toBe(400);
    expect(result.totalInvestedSgd).toBe(500);
  });

  it("calculates net amounts and total fees", () => {
    expect(
      calculateTransactionNetAmount({
        transactionType: "buy",
        amountSgd: 100,
        feeSgd: 5,
      })
    ).toBe(-105);
    expect(
      calculateTransactionNetAmount({
        transactionType: "sell",
        amountSgd: 100,
        feeSgd: 5,
      })
    ).toBe(95);
    expect(
      calculateTotalFeesPaid([{ fee_sgd: 5 }, { fee_sgd: 2.5 }])
    ).toBe(7.5);
  });
});
