import { describe, expect, it } from "vitest";
import {
  buildDefaultWatchlistSeeds,
  getAllDefaultWatchlistTickers,
  resolveDefaultCategory,
  resolveWatchlistCategory,
  WATCHLIST_CATEGORY_DEFAULTS,
} from "./categories";

describe("watchlist categories", () => {
  it("defines four category defaults", () => {
    expect(WATCHLIST_CATEGORY_DEFAULTS.ETF).toEqual([
      "XSP",
      "SPY",
      "QQQ",
      "IWM",
      "GLD",
    ]);
    expect(WATCHLIST_CATEGORY_DEFAULTS["Sector Leader"]).toContain("JPM");
    expect(WATCHLIST_CATEGORY_DEFAULTS["Top 7"]).toContain("NVDA");
    expect(WATCHLIST_CATEGORY_DEFAULTS.Pullbacks).toEqual([]);
  });

  it("resolves default category for tickers", () => {
    expect(resolveDefaultCategory("SPY")).toBe("ETF");
    expect(resolveDefaultCategory("HD")).toBe("Sector Leader");
    expect(resolveDefaultCategory("AAPL")).toBe("Top 7");
    expect(resolveDefaultCategory("XYZ")).toBeNull();
  });

  it("defaults unknown tickers to Pullbacks", () => {
    expect(resolveWatchlistCategory("NKE")).toBe("Pullbacks");
    expect(resolveWatchlistCategory("NKE", "Pullbacks")).toBe("Pullbacks");
  });

  it("builds seeds for all default categories except Pullbacks", () => {
    const seeds = buildDefaultWatchlistSeeds();
    expect(seeds.length).toBe(getAllDefaultWatchlistTickers().length);
    expect(seeds.every((s) => s.category !== "Pullbacks")).toBe(true);
  });
});
