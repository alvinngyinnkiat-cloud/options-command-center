import { describe, expect, it } from "vitest";
import {
  buildCoinHoldingsTotal,
  buildCryptoAllocationSlices,
  buildCryptoDeploymentPlan,
  buildCryptoRankings,
} from "./allocation";
import type { EnrichedCryptoHolding } from "./types";

function holding(
  ticker: string,
  currentValueSgd: number
): EnrichedCryptoHolding {
  return {
    id: ticker,
    assetLabel: "Other",
    ticker,
    totalInvestedSgd: currentValueSgd,
    currentValueSgd,
    profitLossSgd: 0,
    returnPct: 0,
    allocationPct: 0,
    notes: null,
    lastUpdated: "2026-06-08",
    createdAt: "",
    updatedAt: "",
  };
}

describe("crypto allocation", () => {
  it("treats stablecoins as coin holdings in totals and rankings", () => {
    const holdings = [
      holding("BTC", 4_000),
      holding("ETH", 2_000),
      holding("USDT", 1_000),
    ];

    expect(buildCoinHoldingsTotal(holdings)).toBe(7_000);

    const rankings = buildCryptoRankings(holdings);
    expect(rankings.map((r) => r.ticker)).toEqual(["BTC", "ETH", "USDT"]);
    expect(rankings[2].rank).toBe(3);
  });

  it("includes stablecoins and crypto cash in allocation chart", () => {
    const holdings = [
      holding("BTC", 4_000),
      holding("ETH", 2_000),
      holding("USDT", 1_000),
    ];
    const slices = buildCryptoAllocationSlices(holdings, 500);
    const names = slices.map((s) => s.name);

    expect(names).toContain("BTC");
    expect(names).toContain("ETH");
    expect(names).toContain("USDT");
    expect(names).toContain("Crypto Cash");
    expect(slices.reduce((s, x) => s + x.value, 0)).toBe(7_500);
  });

  it("deployment planner uses only crypto cash", () => {
    const plan = buildCryptoDeploymentPlan(500);
    expect(plan.find((b) => b.label === "Top Holding")?.amountSgd).toBe(250);
    expect(plan.reduce((s, b) => s + b.amountSgd, 0)).toBe(500);
  });
});
