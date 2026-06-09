import { describe, expect, it } from "vitest";
import {
  formatPnL,
  formatPnLPercent,
  getPnLChangeType,
  getPnLColor,
} from "./pnl";

describe("pnl formatting", () => {
  it("getPnLColor maps sign to classes", () => {
    expect(getPnLColor(43)).toBe("text-profit");
    expect(getPnLColor(-43)).toBe("text-loss");
    expect(getPnLColor(0)).toBe("text-terminal-muted");
  });

  it("getPnLChangeType treats zero as neutral", () => {
    expect(getPnLChangeType(0)).toBe("neutral");
    expect(getPnLChangeType(0.001)).toBe("positive");
    expect(getPnLChangeType(-0.001)).toBe("negative");
  });

  it("formatPnL USD with 2 decimal places", () => {
    expect(formatPnL(43.4)).toBe("+US$43.40");
    expect(formatPnL(-43.4)).toBe("-US$43.40");
    expect(formatPnL(0)).toBe("US$0.00");
    expect(formatPnL(1550.25)).toBe("+US$1,550.25");
    expect(formatPnL(113.51)).toBe("+US$113.51");
  });

  it("formatPnL SGD with 2 decimal places", () => {
    expect(formatPnL(101.6, { currency: "SGD" })).toBe("+S$101.60");
    expect(formatPnL(-101.6, { currency: "SGD" })).toBe("-S$101.60");
    expect(formatPnL(0, { currency: "SGD" })).toBe("S$0.00");
    expect(formatPnL(6913.68, { currency: "SGD" })).toBe("+S$6,913.68");
  });

  it("formatPnLPercent", () => {
    expect(formatPnLPercent(5.2)).toBe("+5.2%");
    expect(formatPnLPercent(-3.1)).toBe("-3.1%");
    expect(formatPnLPercent(0)).toBe("0.0%");
  });
});
