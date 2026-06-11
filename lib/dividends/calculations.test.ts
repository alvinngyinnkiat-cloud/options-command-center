import { describe, expect, it } from "vitest";
import { buildDividendPortfolioSummary } from "./calculations";
import type { DividendRecordRow } from "@/types/database";

function receivedRow(
  overrides: Partial<DividendRecordRow> & Pick<DividendRecordRow, "category">
): DividendRecordRow {
  return {
    id: "test-id",
    user_id: "user",
    holding_id: null,
    ticker: "SPY",
    market: "US",
    category: overrides.category,
    ex_dividend_date: "2026-03-20",
    record_date: null,
    payment_date: "2026-04-30",
    dividend_per_share: 1.58,
    shares_held: 10,
    gross_dividend: 15.8,
    withholding_tax: 8.4,
    net_dividend: 7.4,
    currency: "USD",
    sgd_equivalent: 9.9,
    fx_rate_to_sgd: null,
    source: "manual",
    status: "received",
    is_manual_override: true,
    is_received: true,
    notes: null,
    api_reference_id: null,
    created_at: "2026-04-30T00:00:00.000Z",
    updated_at: "2026-04-30T00:00:00.000Z",
    ...overrides,
  };
}

describe("buildDividendPortfolioSummary", () => {
  it("sums US received dividends for summary cards (SPY example)", () => {
    const summary = buildDividendPortfolioSummary(
      [
        receivedRow({
          category: "us_etf",
          ticker: "SPY",
          net_dividend: 7.4,
          sgd_equivalent: 9.9,
        }),
      ],
      "2026-06-06",
      2026
    );

    expect(summary.usDividendSgd).toBe(9.9);
    expect(summary.usDividendUsd).toBe(7.4);
    expect(summary.sgDividendSgd).toBe(0);
    expect(summary.totalDividendSgd).toBe(9.9);
  });

  it("counts US dividend with zero SGD until user enters SGD", () => {
    const summary = buildDividendPortfolioSummary(
      [
        receivedRow({
          category: "us_etf",
          net_dividend: 7.4,
          sgd_equivalent: 0,
        }),
      ],
      "2026-06-06",
      2026
    );

    expect(summary.usDividendSgd).toBe(0);
    expect(summary.usDividendUsd).toBe(7.4);
    expect(summary.totalDividendSgd).toBe(0);
  });

  it("includes received dividends regardless of payment year for card totals", () => {
    const summary = buildDividendPortfolioSummary(
      [
        receivedRow({
          category: "us_etf",
          payment_date: "2025-01-15",
          net_dividend: 7.4,
          sgd_equivalent: 9.9,
        }),
      ],
      "2026-06-06",
      2026
    );

    expect(summary.usDividendSgd).toBe(9.9);
    expect(summary.usDividendUsd).toBe(7.4);
  });

  it("sums SG stock and REIT categories into SG dividend card", () => {
    const summary = buildDividendPortfolioSummary(
      [
        receivedRow({
          category: "sg_stock",
          market: "SG",
          ticker: "DBS",
          currency: "SGD",
          net_dividend: 50,
          sgd_equivalent: 50,
        }),
        receivedRow({
          category: "sg_reit",
          market: "SG",
          ticker: "CAPLAND",
          currency: "SGD",
          net_dividend: 30,
          sgd_equivalent: 30,
        }),
      ],
      "2026-06-06",
      2026
    );

    expect(summary.sgDividendSgd).toBe(80);
    expect(summary.totalDividendSgd).toBe(80);
  });

  it("excludes upcoming dividends from card totals", () => {
    const summary = buildDividendPortfolioSummary(
      [
        receivedRow({
          category: "us_etf",
          status: "upcoming",
          is_received: false,
          net_dividend: 7.4,
          sgd_equivalent: 9.9,
        }),
      ],
      "2026-06-06",
      2026
    );

    expect(summary.usDividendSgd).toBe(0);
    expect(summary.usDividendUsd).toBe(0);
    expect(summary.upcoming).toHaveLength(1);
  });
});
