import { describe, expect, it } from "vitest";
import {
  formatOptionDollarTotal,
  formatOptionPrice,
} from "./option-price";

describe("formatOptionPrice", () => {
  it("shows up to 4 significant decimal places", () => {
    expect(formatOptionPrice(1.0096)).toBe("1.0096");
    expect(formatOptionPrice(0.2445)).toBe("0.2445");
    expect(formatOptionPrice(0.0125)).toBe("0.0125");
    expect(formatOptionPrice(0.2524)).toBe("0.2524");
  });

  it("trims trailing zeros", () => {
    expect(formatOptionPrice(2)).toBe("2");
    expect(formatOptionPrice(0.5)).toBe("0.5");
    expect(formatOptionPrice(1.1)).toBe("1.1");
  });
});

describe("formatOptionDollarTotal", () => {
  it("formats whole-dollar totals", () => {
    expect(formatOptionDollarTotal(101)).toBe("US$101");
    expect(formatOptionDollarTotal(399)).toBe("US$399");
    expect(formatOptionDollarTotal(1550)).toBe("US$1,550");
    expect(formatOptionDollarTotal(100.99)).toBe("US$101");
  });
});
