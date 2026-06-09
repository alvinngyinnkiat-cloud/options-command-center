import { describe, expect, it } from "vitest";
import { calculatePositionFromTransactions } from "./recalculate-position";

describe("calculatePositionFromTransactions", () => {
  it("computes weighted average from buys", () => {
    const result = calculatePositionFromTransactions([
      {
        transaction_type: "buy",
        transaction_date: "2026-01-01",
        shares: 10,
        price_per_share: 100,
        total_amount: 1000,
        fees: 0,
      },
      {
        transaction_type: "buy",
        transaction_date: "2026-02-01",
        shares: 5,
        price_per_share: 120,
        total_amount: 600,
        fees: 10,
      },
    ]);

    expect(result.shares).toBe(15);
    expect(result.totalCost).toBe(1610);
    expect(result.averageCost).toBeCloseTo(1610 / 15, 4);
  });

  it("reduces shares and cost on sell using average cost", () => {
    const result = calculatePositionFromTransactions([
      {
        transaction_type: "buy",
        transaction_date: "2026-01-01",
        shares: 100,
        price_per_share: 10,
        total_amount: 1000,
        fees: 0,
      },
      {
        transaction_type: "sell",
        transaction_date: "2026-03-01",
        shares: 40,
        price_per_share: 12,
        total_amount: 480,
        fees: 0,
      },
    ]);

    expect(result.shares).toBe(60);
    expect(result.totalCost).toBe(600);
    expect(result.averageCost).toBe(10);
  });
});
