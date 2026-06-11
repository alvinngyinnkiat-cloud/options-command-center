import { describe, expect, it } from "vitest";
import {
  buildMonthlyContributionTrackerData,
  calculateAllTimeContributions,
  calculateTotalContribution,
  calculateYtdBreakdown,
  calculateYtdContributions,
} from "./calculations";
import type { MonthlyContributionRecord } from "./types";

const sample: MonthlyContributionRecord[] = [
  {
    id: "1",
    contributionMonth: 1,
    contributionYear: 2026,
    stockOptionsAmountSgd: 4_000,
    cryptoAmountSgd: 1_000,
    totalAmountSgd: 5_000,
    notes: null,
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
  },
  {
    id: "2",
    contributionMonth: 2,
    contributionYear: 2026,
    stockOptionsAmountSgd: 3_000,
    cryptoAmountSgd: 2_000,
    totalAmountSgd: 5_000,
    notes: null,
    createdAt: "2026-02-01T00:00:00.000Z",
    updatedAt: "2026-02-01T00:00:00.000Z",
  },
  {
    id: "3",
    contributionMonth: 1,
    contributionYear: 2025,
    stockOptionsAmountSgd: 10_000,
    cryptoAmountSgd: 0,
    totalAmountSgd: 10_000,
    notes: null,
    createdAt: "2025-01-01T00:00:00.000Z",
    updatedAt: "2025-01-01T00:00:00.000Z",
  },
];

describe("monthly contribution calculations", () => {
  it("sums stock and crypto for total", () => {
    expect(calculateTotalContribution(4_000, 1_500)).toBe(5_500);
  });

  it("calculates YTD for a single year", () => {
    expect(calculateYtdContributions(sample, 2026)).toBe(10_000);
  });

  it("builds tracker data with average over months with amounts", () => {
    const data = buildMonthlyContributionTrackerData(sample, 2026, "mock");
    expect(data.ytdContributions).toBe(10_000);
    expect(data.ytdBreakdown.stockOptionsAmountSgd).toBe(7_000);
    expect(data.ytdBreakdown.cryptoAmountSgd).toBe(3_000);
    expect(data.ytdBreakdown.totalAmountSgd).toBe(10_000);
    expect(data.allTimeContributions).toBe(20_000);
    expect(data.averageMonthlyContribution).toBeCloseTo(6_666.67, 0);
    expect(data.contributions).toHaveLength(3);
  });

  it("calculates all-time contribution total", () => {
    expect(calculateAllTimeContributions(sample)).toBe(20_000);
  });

  it("calculates YTD breakdown with percentages", () => {
    const breakdown = calculateYtdBreakdown(sample, 2026);
    expect(breakdown.stockOptionsAmountSgd).toBe(7_000);
    expect(breakdown.cryptoAmountSgd).toBe(3_000);
    expect(breakdown.stockOptionsPct).toBeCloseTo(70, 0);
    expect(breakdown.cryptoPct).toBeCloseTo(30, 0);
  });
});
