import { describe, expect, it } from "vitest";
import { buildTickerDividendTotals } from "@/lib/dividends/calculations";
import type { DividendRecordRow } from "@/types/database";
import {
  calculateAdjustedCostBasisSg,
  calculateAdjustedCostBasisUs,
  calculateIncomeYieldPct,
} from "./income-yield";
import { buildSgMarketData, buildUsMarketData } from "./market-aggregate";
import type { EnrichedStockEtfHolding } from "@/lib/stocks-etfs/types";

const usHolding = (
  partial: Partial<EnrichedStockEtfHolding> & Pick<EnrichedStockEtfHolding, "ticker">
): EnrichedStockEtfHolding =>
  ({
    id: partial.ticker,
    assetType: "etf",
    currency: "USD",
    sector: "Broad Market",
    totalInvestedNative: 10_000,
    currentValueNative: 11_000,
    fxRateToSgd: 1.35,
    totalInvestedSgd: 13_500,
    currentValueSgd: 14_850,
    profitLossSgd: 1350,
    returnPct: 10,
    allocationPct: 5,
    sharesHeld: 100,
    averageCost: 100,
    dividendYield: null,
    annualDividendIncome: null,
    notes: null,
    lastUpdated: "2026-06-06",
    createdAt: "",
    updatedAt: "",
    ...partial,
  }) as EnrichedStockEtfHolding;

const sgHolding = (
  partial: Partial<EnrichedStockEtfHolding> & Pick<EnrichedStockEtfHolding, "ticker">
): EnrichedStockEtfHolding =>
  ({
    id: partial.ticker,
    assetType: "stock",
    currency: "SGD",
    sector: "Financials",
    totalInvestedNative: 20_000,
    currentValueNative: 22_000,
    fxRateToSgd: 1,
    totalInvestedSgd: 20_000,
    currentValueSgd: 22_000,
    profitLossSgd: 2000,
    returnPct: 10,
    allocationPct: 8,
    sharesHeld: 500,
    averageCost: 40,
    dividendYield: null,
    annualDividendIncome: null,
    notes: null,
    lastUpdated: "2026-06-06",
    createdAt: "",
    updatedAt: "",
    ...partial,
  }) as EnrichedStockEtfHolding;

function dividendRecord(
  partial: Partial<DividendRecordRow> & Pick<DividendRecordRow, "ticker" | "net_dividend">
): DividendRecordRow {
  return {
    id: partial.id ?? `div-${partial.ticker}`,
    user_id: "mock-user",
    holding_id: null,
    ticker: partial.ticker,
    market: partial.market ?? "US",
    category: partial.category ?? "us_etf",
    ex_dividend_date: partial.ex_dividend_date ?? "2026-03-01",
    record_date: partial.record_date ?? null,
    payment_date: partial.payment_date ?? "2026-03-15",
    dividend_per_share: partial.dividend_per_share ?? 1,
    shares_held: partial.shares_held ?? 100,
    gross_dividend: partial.gross_dividend ?? Number(partial.net_dividend),
    withholding_tax: partial.withholding_tax ?? 0,
    net_dividend: partial.net_dividend,
    currency: partial.currency ?? "USD",
    sgd_equivalent: partial.sgd_equivalent ?? Number(partial.net_dividend),
    fx_rate_to_sgd: partial.fx_rate_to_sgd ?? 1.35,
    source: partial.source ?? "manual",
    status: partial.status ?? "received",
    is_manual_override: partial.is_manual_override ?? true,
    is_received: partial.is_received ?? true,
    notes: partial.notes ?? null,
    api_reference_id: partial.api_reference_id ?? null,
    created_at: partial.created_at ?? "2026-03-15T00:00:00.000Z",
    updated_at: partial.updated_at ?? "2026-03-15T00:00:00.000Z",
  };
}

describe("market income yield", () => {
  it("calculates income yield from annual passive income", () => {
    expect(calculateIncomeYieldPct(1000, 10_000)).toBe(10);
  });

  it("reduces US adjusted cost basis by premium and dividend", () => {
    expect(calculateAdjustedCostBasisUs(10_000, 650, 350)).toBe(9000);
  });

  it("reduces SG adjusted cost basis by dividend only", () => {
    expect(calculateAdjustedCostBasisSg(20_000, 1000)).toBe(19_000);
  });
});

describe("market aggregation", () => {
  it("builds US market rows with dividend from tracker", () => {
    const totals = buildTickerDividendTotals(
      [dividendRecord({ ticker: "SPY", net_dividend: 350 })],
      "2026-06-06",
      2026
    );
    const { rows, summary } = buildUsMarketData(
      [usHolding({ ticker: "SPY" })],
      [],
      totals
    );
    expect(rows).toHaveLength(1);
    expect(rows[0].annualDividendIncome).toBe(350);
    expect(rows[0].incomeYieldPct).toBeCloseTo(3.5, 0);
    expect(summary.totalDividendIncome).toBe(350);
  });

  it("builds SG market without options fields", () => {
    const totals = buildTickerDividendTotals(
      [dividendRecord({ ticker: "DBS", market: "SG", net_dividend: 1000, currency: "SGD" })],
      "2026-06-06",
      2026
    );
    const { rows, summary } = buildSgMarketData(
      [sgHolding({ ticker: "DBS" })],
      totals
    );
    expect(rows).toHaveLength(1);
    expect(rows[0].annualDividendIncome).toBe(1000);
    expect(summary.totalPassiveIncome).toBe(summary.totalDividendIncome);
  });

  it("ignores holding-level dividend fields when tracker has no records", () => {
    const { rows } = buildUsMarketData(
      [usHolding({ ticker: "SPY", annualDividendIncome: 999 })],
      []
    );
    expect(rows[0].annualDividendIncome).toBe(0);
  });
});
