import { describe, expect, it } from "vitest";
import { buildPersonalPortfolioProfitLoss } from "./personal-profit-loss";

describe("buildPersonalPortfolioProfitLoss", () => {
  it("computes P/L and return from my portfolio value and contributions", () => {
    const result = buildPersonalPortfolioProfitLoss(120_000, 100_000);
    expect(result.myPortfolioPnl).toBe(20_000);
    expect(result.myReturnPct).toBe(20);
  });

  it("returns 0% when contributions are zero", () => {
    const result = buildPersonalPortfolioProfitLoss(50_000, 0);
    expect(result.myPortfolioPnl).toBe(50_000);
    expect(result.myReturnPct).toBe(0);
  });

  it("handles loss", () => {
    const result = buildPersonalPortfolioProfitLoss(80_000, 100_000);
    expect(result.myPortfolioPnl).toBe(-20_000);
    expect(result.myReturnPct).toBe(-20);
  });
});
