import { describe, expect, it } from "vitest";
import {
  buildCoinHoldingsTotal,
  buildCryptoDeploymentPlan,
  buildCryptoRankings,
  buildCryptoTierGroups,
  splitOpenClosedHoldings,
  tierGroupsToAllocationSlices,
} from "./allocation";
import type { EnrichedCryptoHolding } from "./types";

function holding(
  ticker: string,
  currentValueSgd: number,
  invested = currentValueSgd
): EnrichedCryptoHolding {
  return {
    id: ticker,
    assetLabel: "Other",
    ticker,
    totalInvestedSgd: invested,
    currentValueSgd,
    profitLossSgd: currentValueSgd - invested,
    returnPct: 0,
    allocationPct: 0,
    notes: null,
    lastUpdated: "2026-06-08",
    createdAt: "",
    updatedAt: "",
  };
}

describe("crypto allocation V2", () => {
  it("builds four tier groups for allocation chart", () => {
    const holdings = [
      holding("BTC", 4_000),
      holding("ETH", 2_000),
      holding("SOL", 1_000),
      holding("USDT", 500),
    ];
    const total = 7_500;
    const tiers = buildCryptoTierGroups(holdings, 0, total);
    expect(tiers).toHaveLength(4);
    expect(tiers.map((t) => t.label)).toEqual([
      "Top Holding",
      "2nd–5th Holdings",
      "6th–10th Holdings",
      "Others",
    ]);
    expect(tiers[0].value).toBe(4_000);
    expect(tiers[1].value).toBe(3_500);

    const slices = tierGroupsToAllocationSlices(tiers);
    expect(slices.every((s) => s.value > 0)).toBe(true);
    expect(slices.reduce((s, x) => s + x.percent, 0)).toBeCloseTo(100, 0);
  });

  it("includes exchange cash in Others tier", () => {
    const holdings = [holding("BTC", 4_000)];
    const tiers = buildCryptoTierGroups(holdings, 500, 4_500);
    const others = tiers.find((t) => t.label === "Others");
    expect(others?.value).toBe(500);
  });

  it("treats stablecoins as coin holdings in totals and rankings", () => {
    const holdings = [
      holding("BTC", 4_000),
      holding("ETH", 2_000),
      holding("USDT", 1_000),
    ];

    expect(buildCoinHoldingsTotal(holdings)).toBe(7_000);

    const rankings = buildCryptoRankings(holdings);
    expect(rankings.map((r) => r.ticker)).toEqual(["BTC", "ETH", "USDT"]);
  });

  it("deployment planner uses only crypto cash", () => {
    const plan = buildCryptoDeploymentPlan(500);
    expect(plan.find((b) => b.label === "Top Holding")?.amountSgd).toBe(250);
    expect(plan.reduce((s, b) => s + b.amountSgd, 0)).toBe(500);
  });

  it("splits open and closed positions by current value", () => {
    const holdings = [
      holding("WLD", 0, 100),
      holding("ICP", 500),
      holding("OTHER", 0, 50),
    ];
    const { open, closed } = splitOpenClosedHoldings(holdings);
    expect(open.map((h) => h.ticker)).toEqual(["ICP"]);
    expect(closed.map((h) => h.ticker).sort()).toEqual(["OTHER", "WLD"]);
  });
});
