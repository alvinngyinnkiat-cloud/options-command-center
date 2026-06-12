import { describe, expect, it } from "vitest";
import { buildMigrationTransactions } from "./migrate-holding";
import type { StockEtfHolding } from "@/types/database";

function mockHolding(overrides: Partial<StockEtfHolding> = {}): StockEtfHolding {
  return {
    id: "h1",
    user_id: "u1",
    ticker: "AAPL",
    asset_type: "stock",
    currency: "USD",
    sector: "Technology",
    total_invested_native: 10_000,
    current_value_native: 12_000,
    fx_rate_to_sgd: 1.35,
    total_invested_sgd: 13_500,
    current_value_sgd: 16_200,
    shares_held: 100,
    average_cost: 100,
    last_market_price_native: null,
    last_price_date: null,
    price_source: null,
    manual_value_override: true,
    manual_total_dividend: 250,
    manual_total_fees: 50,
    notes: null,
    last_updated: "2026-01-01",
    created_at: "2026-01-01",
    updated_at: "2026-01-01",
    ...overrides,
  };
}

describe("buildMigrationTransactions", () => {
  it("creates opening balance and dividend transactions", () => {
    const txs = buildMigrationTransactions(mockHolding(), "u1");
    expect(txs).toHaveLength(2);
    expect(txs[0].transaction_type).toBe("opening_balance");
    expect(txs[0].shares).toBe(100);
    expect(txs[0].fees).toBe(50);
    expect(txs[1].transaction_type).toBe("dividend");
    expect(txs[1].total_amount).toBe(250);
  });
});
