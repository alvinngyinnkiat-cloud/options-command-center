import { describe, expect, it } from "vitest";
import {
  buildDefaultWatchlistSeeds,
  WATCHLIST_CATEGORY_DEFAULTS,
} from "@/lib/watchlist/categories";
import {
  compareWatchlistRank,
  resolveCategoryDisplayRank,
  resolveDisplayRank,
  sortRowsByWatchlistRank,
} from "@/lib/watchlist/watchlist-rank";
import type { WatchlistScannerRow } from "@/lib/watchlist/types";

function row(
  partial: Pick<
    WatchlistScannerRow,
    "ticker" | "category" | "priorityRank" | "sortOrder"
  >
): WatchlistScannerRow {
  return {
    watchlistId: partial.ticker,
    isActive: true,
    notes: null,
    market: {} as WatchlistScannerRow["market"],
    previousMarket: {} as WatchlistScannerRow["previousMarket"],
    averagePriceComparison: {} as WatchlistScannerRow["averagePriceComparison"],
    technicals: {} as WatchlistScannerRow["technicals"],
    previousTechnicals: {} as WatchlistScannerRow["previousTechnicals"],
    technicalComparisons: {} as WatchlistScannerRow["technicalComparisons"],
    distances: {} as WatchlistScannerRow["distances"],
    averagePricePosition: {} as WatchlistScannerRow["averagePricePosition"],
    supportResistance: {} as WatchlistScannerRow["supportResistance"],
    weeklySupportResistance: null,
    ...partial,
  } as WatchlistScannerRow;
}

describe("watchlist rank ordering", () => {
  it("orders ETF tickers by canonical priority_rank", () => {
    const seeds = WATCHLIST_CATEGORY_DEFAULTS.ETF;
    const rows = sortRowsByWatchlistRank(
      [...seeds]
        .reverse()
        .map((seed) =>
          row({
            ticker: seed.ticker,
            category: "ETF",
            priorityRank: seed.priorityRank,
            sortOrder: seed.priorityRank - 1,
          })
        )
    );

    expect(rows.map((r) => r.ticker)).toEqual([
      "XSP",
      "MGK",
      "QQQ",
      "IWM",
      "GLD",
    ]);
    expect(new Set(rows.map((r) => r.priorityRank)).size).toBe(5);
  });

  it("uses sort_order as tie-breaker within category", () => {
    const a = row({
      ticker: "B",
      category: "TOP7",
      priorityRank: 2,
      sortOrder: 5,
    });
    const b = row({
      ticker: "A",
      category: "TOP7",
      priorityRank: 2,
      sortOrder: 3,
    });

    expect(compareWatchlistRank(a, b)).toBeGreaterThan(0);
  });

  it("assigns unique ranks across default seeds", () => {
    const seeds = buildDefaultWatchlistSeeds();
    for (const category of ["ETF", "SECTOR_LEADER", "TOP7", "PULLBACK"] as const) {
      const categorySeeds = seeds.filter((s) => s.category === category);
      const ranks = categorySeeds.map((s) => s.priorityRank);
      expect(new Set(ranks).size).toBe(ranks.length);
    }
  });

  it("resolves category-local ranks for PULLBACK defaults", () => {
    expect(resolveCategoryDisplayRank("PG", "PULLBACK", 20)).toBe(3);
    expect(resolveCategoryDisplayRank("V", "PULLBACK", 21)).toBe(4);
    expect(resolveCategoryDisplayRank("INTU", "PULLBACK", 7)).toBe(7);
    expect(resolveDisplayRank({ priorityRank: 3 })).toBe(3);
  });

  it("never uses global sort_order as display rank for canonical tickers", () => {
    expect(resolveCategoryDisplayRank("TMUS", "PULLBACK", 999)).toBe(1);
    expect(resolveCategoryDisplayRank("AAPL", "TOP7", 99)).toBe(1);
  });
});
