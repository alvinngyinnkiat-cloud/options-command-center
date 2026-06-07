import {
  CATEGORY_LABELS,
  CATEGORY_LIMITS,
  LARGE_CAP_MAX_B,
  LARGE_CAP_MIN_B,
  MEGA_CAP_MIN_B,
  MID_LARGE_CAP_MAX_B,
  MID_LARGE_CAP_MIN_B,
} from "./constants";
import { enrichSnapshotMetrics } from "./calculations";
import type {
  AutoWatchlistCategory,
  AutoWatchlistCategoryId,
  AutoWatchlistEntry,
  MarketCapSnapshot,
} from "./types";

function sortByMarketCapDesc(a: MarketCapSnapshot, b: MarketCapSnapshot): number {
  return b.marketCapBillions - a.marketCapBillions;
}

function toEntry(
  snapshot: MarketCapSnapshot,
  category: AutoWatchlistCategoryId,
  rank: number,
  generatedAt: string,
  idPrefix: string
): AutoWatchlistEntry {
  const metrics = enrichSnapshotMetrics(snapshot);
  return {
    id: `${idPrefix}-${category}-${rank}`,
    category,
    rank,
    ticker: snapshot.ticker,
    companyName: snapshot.companyName,
    marketCapBillions: snapshot.marketCapBillions,
    sector: snapshot.sector,
    currentPrice: snapshot.currentPrice,
    oneYearPerformancePercent: snapshot.oneYearPerformancePercent,
    fiftyTwoWeekHigh: snapshot.fiftyTwoWeekHigh,
    fiftyTwoWeekLow: snapshot.fiftyTwoWeekLow,
    distanceFromHighPercent: metrics.distanceFromHighPercent,
    distanceFromLowPercent: metrics.distanceFromLowPercent,
    generatedAt,
  };
}

function screenCategory(
  universe: MarketCapSnapshot[],
  category: AutoWatchlistCategoryId,
  generatedAt: string,
  idPrefix: string
): AutoWatchlistEntry[] {
  const limit = CATEGORY_LIMITS[category];
  let pool: MarketCapSnapshot[];

  switch (category) {
    case "mega_cap_leaders":
      pool = universe.filter((s) => s.marketCapBillions >= MEGA_CAP_MIN_B);
      break;
    case "mega_cap_pullback":
      pool = universe.filter(
        (s) =>
          s.marketCapBillions >= MEGA_CAP_MIN_B &&
          s.oneYearPerformancePercent < 0
      );
      break;
    case "large_cap_pullback":
      pool = universe.filter(
        (s) =>
          s.marketCapBillions >= LARGE_CAP_MIN_B &&
          s.marketCapBillions <= LARGE_CAP_MAX_B &&
          s.oneYearPerformancePercent < 0
      );
      break;
    case "mid_large_cap_pullback":
      pool = universe.filter(
        (s) =>
          s.marketCapBillions >= MID_LARGE_CAP_MIN_B &&
          s.marketCapBillions <= MID_LARGE_CAP_MAX_B &&
          s.oneYearPerformancePercent < 0
      );
      break;
  }

  return pool
    .sort(sortByMarketCapDesc)
    .slice(0, limit)
    .map((s, i) => toEntry(s, category, i + 1, generatedAt, idPrefix));
}

const CATEGORY_ORDER: AutoWatchlistCategoryId[] = [
  "mega_cap_leaders",
  "mega_cap_pullback",
  "large_cap_pullback",
  "mid_large_cap_pullback",
];

export function buildAutoWatchlistCategories(
  universe: MarketCapSnapshot[],
  generatedAt: string,
  idPrefix = "auto"
): AutoWatchlistCategory[] {
  return CATEGORY_ORDER.map((id) => ({
    id,
    title: CATEGORY_LABELS[id].title,
    description: CATEGORY_LABELS[id].description,
    entries: screenCategory(universe, id, generatedAt, idPrefix),
  }));
}

export function flattenCategories(
  categories: AutoWatchlistCategory[]
): AutoWatchlistEntry[] {
  return categories.flatMap((c) => c.entries);
}
