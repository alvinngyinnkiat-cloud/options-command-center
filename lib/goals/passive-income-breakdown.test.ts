import { describe, expect, it } from "vitest";
import {
  computePassiveIncomeFromDividendSummary,
  computePassiveIncomeMonthlySgd,
  EMPTY_PASSIVE_INCOME_BREAKDOWN,
  formatPassiveIncomeCalculationSource,
  PASSIVE_INCOME_SOURCE_LINE,
} from "./passive-income-breakdown";

describe("passive income breakdown", () => {
  it("monthly = annual dividend SGD / 12", () => {
    const summary = {
      annualDividendSgd: 1200,
      usDividendSgdYtd: 720,
      sgDividendSgdYtd: 480,
    };
    const breakdown = computePassiveIncomeFromDividendSummary(summary);
    expect(breakdown.annualTotalSgd).toBe(1200);
    expect(breakdown.monthlySgd).toBe(100);
    expect(breakdown.usDividendSgd).toBe(720);
    expect(breakdown.sgDividendSgd).toBe(480);
    expect(computePassiveIncomeMonthlySgd(summary)).toBe(100);
  });

  it("returns zero when no dividend records", () => {
    expect(EMPTY_PASSIVE_INCOME_BREAKDOWN.monthlySgd).toBe(0);
    expect(
      computePassiveIncomeFromDividendSummary({
        annualDividendSgd: 0,
        usDividendSgdYtd: 0,
        sgDividendSgdYtd: 0,
      }).monthlySgd
    ).toBe(0);
  });

  it("shows dividends-only source line", () => {
    expect(
      formatPassiveIncomeCalculationSource(EMPTY_PASSIVE_INCOME_BREAKDOWN)
    ).toBe(PASSIVE_INCOME_SOURCE_LINE);
  });
});
