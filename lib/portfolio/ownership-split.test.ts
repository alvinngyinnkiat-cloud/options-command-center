import { describe, expect, it } from "vitest";
import { buildPortfolioOwnershipSplit } from "./ownership-split";

describe("buildPortfolioOwnershipSplit", () => {
  it("splits total into client and my portfolio", () => {
    const split = buildPortfolioOwnershipSplit(44_180.71, 15_000);
    expect(split.totalPortfolioSgd).toBeCloseTo(44_180.71, 2);
    expect(split.clientPortfolioSgd).toBe(15_000);
    expect(split.myPortfolioSgd).toBeCloseTo(29_180.71, 2);
    expect(split.clientOwnershipPct).toBeCloseTo(33.9, 1);
    expect(split.myOwnershipPct).toBeCloseTo(66.1, 1);
  });

  it("clamps client to total and defaults null to zero", () => {
    const split = buildPortfolioOwnershipSplit(10_000, null);
    expect(split.clientPortfolioSgd).toBe(0);
    expect(split.myPortfolioSgd).toBe(10_000);
  });
});
