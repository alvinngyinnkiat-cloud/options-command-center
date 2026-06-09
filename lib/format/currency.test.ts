import { describe, expect, it } from "vitest";
import {
  formatCurrencyAmount,
  formatMoney,
  formatNumber,
  formatSgd,
  formatSignedSgd,
  formatSignedUsd,
  formatUsd,
  MONEY_DECIMALS,
} from "./currency";

describe("currency formatting", () => {
  it("uses 2 decimal places by default for SGD and USD", () => {
    expect(MONEY_DECIMALS).toBe(2);
    expect(formatSgd(1234.56)).toBe("S$1,234.56");
    expect(formatSgd(50000)).toBe("S$50,000.00");
    expect(formatUsd(113.51)).toBe("US$113.51");
    expect(formatUsd(5358.54)).toBe("US$5,358.54");
  });

  it("formatMoney is the canonical formatter", () => {
    expect(formatMoney(6913.68, "SGD")).toBe("S$6,913.68");
    expect(formatMoney(113.51, "USD")).toBe("US$113.51");
  });

  it("formatCurrencyAmount is deterministic for both currencies", () => {
    expect(formatCurrencyAmount(1234.56, "SGD", 2)).toBe("S$1,234.56");
    expect(formatCurrencyAmount(5358.54, "USD", 2)).toBe("US$5,358.54");
  });

  it("formats signed values consistently", () => {
    expect(formatSignedSgd(100)).toBe("+S$100.00");
    expect(formatSignedSgd(-100)).toBe("-S$100.00");
    expect(formatSignedUsd(5358.54)).toBe("+US$5,358.54");
    expect(formatSignedUsd(-5358.54)).toBe("-US$5,358.54");
  });

  it("formatNumber avoids locale-dependent separators", () => {
    expect(formatNumber(1234567.89, 2)).toBe("1,234,567.89");
  });
});
