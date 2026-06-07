import { describe, expect, it } from "vitest";
import {
  evaluateSellCallShareCheck,
  evaluateSellPutCashCheck,
} from "./single-leg-checks";

describe("single-leg risk checks", () => {
  it("passes sell put when USD cash covers assignment", () => {
    const result = evaluateSellPutCashCheck({
      tradeId: "t1",
      ticker: "SPY",
      contracts: 1,
      shortPutStrike: 500,
      requiredCash: 50000,
      usdCashAvailable: 60000,
    });
    expect(result.canOpen).toBe(true);
  });

  it("fails sell put when USD cash is insufficient", () => {
    const result = evaluateSellPutCashCheck({
      tradeId: "t1",
      ticker: "SPY",
      contracts: 1,
      shortPutStrike: 500,
      requiredCash: 50000,
      usdCashAvailable: 40000,
    });
    expect(result.canOpen).toBe(false);
  });

  it("passes covered call when shares are sufficient", () => {
    const result = evaluateSellCallShareCheck({
      tradeId: "t2",
      ticker: "AAPL",
      contracts: 1,
      coverage: "covered",
      sharesOwned: 200,
      requiredShares: 100,
    });
    expect(result.canOpen).toBe(true);
    expect(result.nakedWarning).toBeNull();
  });

  it("flags naked call with unlimited risk warning", () => {
    const result = evaluateSellCallShareCheck({
      tradeId: "t3",
      ticker: "TSLA",
      contracts: 1,
      coverage: "naked",
      sharesOwned: 0,
      requiredShares: 100,
    });
    expect(result.canOpen).toBe(false);
    expect(result.isNaked).toBe(true);
    expect(result.nakedWarning).toContain("Unlimited risk");
  });
});
