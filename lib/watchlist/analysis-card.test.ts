import { describe, expect, it } from "vitest";
import {
  calculateMidPoint,
  getPriceVsMaLabel,
  getSoRollingLabel,
  getTickerWeekendReviewFlags,
} from "./analysis-card";
import type { WatchlistScannerRow } from "./types";
import type { WeekendReviewStatus } from "@/lib/weekend-review/types";

describe("calculateMidPoint", () => {
  it("averages support and resistance", () => {
    expect(calculateMidPoint(100, 120)).toBe(110);
  });

  it("returns null when levels missing", () => {
    expect(calculateMidPoint(null, 120)).toBeNull();
  });
});

describe("getSoRollingLabel", () => {
  it("labels rolling up as bullish when rising", () => {
    expect(getSoRollingLabel(25, "up").label).toBe("Rolling Up");
    expect(getSoRollingLabel(25, "up").sentiment).toBe("bullish");
  });

  it("labels rolling down as bearish when falling from overbought", () => {
    expect(getSoRollingLabel(75, "down").sentiment).toBe("bearish");
  });
});

describe("getPriceVsMaLabel", () => {
  it("classifies above as bullish", () => {
    expect(getPriceVsMaLabel(110, 100).label).toBe("Above");
    expect(getPriceVsMaLabel(110, 100).sentiment).toBe("bullish");
  });
});

describe("getTickerWeekendReviewFlags", () => {
  const baseRow = {
    supportResistance: {
      updateDate: "2026-06-01",
      support1: 100,
    },
  } as WatchlistScannerRow;

  const status: WeekendReviewStatus = {
    lastReviewDate: "2026-06-01",
    nextReviewDueDate: "2026-06-07",
    weekEnding: "2026-05-30",
    tickerCount: 1,
    dataSource: "mock",
    isDue: false,
  };

  it("marks updated this weekend when S/R date matches last review", () => {
    const flags = getTickerWeekendReviewFlags(baseRow, status);
    expect(flags.updatedThisWeekend).toBe(true);
    expect(flags.needsReview).toBe(false);
  });
});
