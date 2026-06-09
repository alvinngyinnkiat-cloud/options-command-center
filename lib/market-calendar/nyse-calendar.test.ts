import { describe, expect, it } from "vitest";
import {
  isNyseTradingDay,
  lastCompletedTradingDate,
} from "./nyse-calendar";

describe("nyse calendar", () => {
  it("treats weekends as non-trading days", () => {
    expect(isNyseTradingDay("2026-06-06")).toBe(false);
    expect(isNyseTradingDay("2026-06-07")).toBe(false);
  });

  it("uses prior session before US market close on 2026-06-09", () => {
    const beforeClose = new Date("2026-06-09T18:00:00.000Z");
    expect(lastCompletedTradingDate(beforeClose)).toBe("2026-06-08");
  });

  it("uses same day after US market close on 2026-06-09", () => {
    const afterClose = new Date("2026-06-09T21:30:00.000Z");
    expect(lastCompletedTradingDate(afterClose)).toBe("2026-06-09");
  });
});
