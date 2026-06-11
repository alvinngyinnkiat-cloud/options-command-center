import { describe, expect, it } from "vitest";
import {
  applyBuyToHolding,
  applySellToHolding,
  validateBuyTransaction,
  validateFeeTransaction,
  validateSellTransaction,
  CryptoTransactionError,
} from "./transaction-engine";
import {
  calculateTotalFeesPaid,
  calculateTransactionNetAmount,
} from "./transaction-types";

describe("crypto transaction engine", () => {
  it("requires positive buy amount", () => {
    expect(() =>
      validateBuyTransaction({
        buyAmountSgd: 0,
        feeSgd: 5,
      })
    ).toThrow(CryptoTransactionError);
  });

  it("blocks sell when amount exceeds position", () => {
    expect(() =>
      validateSellTransaction({ sellAmountSgd: 200, currentValueSgd: 100 })
    ).toThrow("Sell Amount Exceeds Position Value");
  });

  it("requires positive fee amount", () => {
    expect(() => validateFeeTransaction({ feeSgd: 0 })).toThrow(
      CryptoTransactionError
    );
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
      calculateTransactionNetAmount({
        transactionType: "fee",
        amountSgd: 10,
        feeSgd: 10,
      })
    ).toBe(-10);
    expect(
      calculateTotalFeesPaid([{ fee_sgd: 5 }, { fee_sgd: 2.5 }])
    ).toBe(7.5);
  });
});
