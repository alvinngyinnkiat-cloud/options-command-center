import { describe, expect, it } from "vitest";
import {
  buildDefaultWatchlistSeeds,
  getAllDefaultWatchlistTickers,
  getCategoryLabel,
  normalizeWatchlistCategory,
  resolveDefaultCategory,
  resolveWatchlistCategory,
  WATCHLIST_CATEGORY_DEFAULTS,
} from "./categories";

describe("watchlist categories", () => {
  it("defines 25 default tickers across 4 categories", () => {
    expect(WATCHLIST_CATEGORY_DEFAULTS.ETF).toHaveLength(5);
    expect(WATCHLIST_CATEGORY_DEFAULTS.SECTOR_LEADER).toHaveLength(6);
    expect(WATCHLIST_CATEGORY_DEFAULTS.TOP7).toHaveLength(7);
    expect(WATCHLIST_CATEGORY_DEFAULTS.PULLBACK).toHaveLength(7);
    expect(getAllDefaultWatchlistTickers()).toHaveLength(25);
  });

  it("uses display labels for UI", () => {
    expect(getCategoryLabel("SECTOR_LEADER")).toBe("Sector Leaders");
    expect(getCategoryLabel("TOP7")).toBe("Top 7");
    expect(getCategoryLabel("PULLBACK")).toBe("Pullbacks");
  });

  it("normalizes legacy category strings", () => {
    expect(normalizeWatchlistCategory("Sector Leader")).toBe("SECTOR_LEADER");
    expect(normalizeWatchlistCategory("Top 7")).toBe("TOP7");
    expect(normalizeWatchlistCategory("Pullbacks")).toBe("PULLBACK");
  });

  it("resolves default category for tickers", () => {
    expect(resolveDefaultCategory("QQQ")).toBe("ETF");
    expect(resolveDefaultCategory("GOOG")).toBe("TOP7");
    expect(resolveDefaultCategory("JPM")).toBe("SECTOR_LEADER");
    expect(resolveDefaultCategory("TMUS")).toBe("PULLBACK");
    expect(resolveDefaultCategory("XYZ")).toBeNull();
  });

  it("defaults unknown tickers to PULLBACK", () => {
    expect(resolveWatchlistCategory("NKE")).toBe("PULLBACK");
    expect(resolveWatchlistCategory("NKE", "PULLBACK")).toBe("PULLBACK");
  });

  it("builds seeds for all 25 default tickers", () => {
    const seeds = buildDefaultWatchlistSeeds();
    expect(seeds.length).toBe(25);
    expect(seeds.every((s) => s.priorityRank > 0)).toBe(true);
  });
});
