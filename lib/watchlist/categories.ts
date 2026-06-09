/** Stored watchlist category codes (Supabase watchlist.watchlist_category). */
export type WatchlistCategory =
  | "ETF"
  | "SECTOR_LEADER"
  | "TOP7"
  | "PULLBACK";

export const WATCHLIST_CATEGORIES: WatchlistCategory[] = [
  "ETF",
  "SECTOR_LEADER",
  "TOP7",
  "PULLBACK",
];

export const WATCHLIST_CATEGORY_LABELS: Record<WatchlistCategory, string> = {
  ETF: "ETF",
  SECTOR_LEADER: "Sector Leaders",
  TOP7: "Top 7",
  PULLBACK: "Pullbacks",
};

export interface WatchlistCategorySeed {
  ticker: string;
  priorityRank: number;
}

/** Default manual universe — 25 tickers across 4 categories (seeds only; DB is source of truth). */
export const WATCHLIST_CATEGORY_DEFAULTS: Record<
  WatchlistCategory,
  readonly WatchlistCategorySeed[]
> = {
  ETF: [
    { ticker: "XSP", priorityRank: 1 },
    { ticker: "MGK", priorityRank: 2 },
    { ticker: "QQQ", priorityRank: 3 },
    { ticker: "IWM", priorityRank: 4 },
    { ticker: "GLD", priorityRank: 5 },
  ],
  SECTOR_LEADER: [
    { ticker: "JPM", priorityRank: 1 },
    { ticker: "CAT", priorityRank: 2 },
    { ticker: "WMT", priorityRank: 3 },
    { ticker: "UNH", priorityRank: 4 },
    { ticker: "XOM", priorityRank: 5 },
    { ticker: "HD", priorityRank: 6 },
  ],
  TOP7: [
    { ticker: "AAPL", priorityRank: 1 },
    { ticker: "MSFT", priorityRank: 2 },
    { ticker: "NVDA", priorityRank: 3 },
    { ticker: "AVGO", priorityRank: 4 },
    { ticker: "AMZN", priorityRank: 5 },
    { ticker: "META", priorityRank: 6 },
    { ticker: "GOOG", priorityRank: 7 },
  ],
  PULLBACK: [
    { ticker: "TMUS", priorityRank: 1 },
    { ticker: "NFLX", priorityRank: 2 },
    { ticker: "PG", priorityRank: 3 },
    { ticker: "V", priorityRank: 4 },
    { ticker: "MA", priorityRank: 5 },
    { ticker: "ACN", priorityRank: 6 },
    { ticker: "INTU", priorityRank: 7 },
  ],
};

const LEGACY_CATEGORY_MAP: Record<string, WatchlistCategory> = {
  etf: "ETF",
  ETF: "ETF",
  Etf: "ETF",
  "sector leader": "SECTOR_LEADER",
  "sector leaders": "SECTOR_LEADER",
  "SECTOR LEADER": "SECTOR_LEADER",
  "SECTOR LEADERS": "SECTOR_LEADER",
  "Sector Leader": "SECTOR_LEADER",
  "Sector Leaders": "SECTOR_LEADER",
  SECTOR_LEADER: "SECTOR_LEADER",
  "top 7": "TOP7",
  "TOP 7": "TOP7",
  "Top 7": "TOP7",
  TOP7: "TOP7",
  pullback: "PULLBACK",
  pullbacks: "PULLBACK",
  Pullback: "PULLBACK",
  Pullbacks: "PULLBACK",
  PULLBACKS: "PULLBACK",
  PULLBACK: "PULLBACK",
};

function legacyCategoryKey(value: string): string {
  const trimmed = value.trim();
  const lower = trimmed.toLowerCase();
  if (LEGACY_CATEGORY_MAP[trimmed]) return trimmed;
  if (LEGACY_CATEGORY_MAP[lower]) return lower;
  return trimmed;
}

export function getCategoryLabel(category: WatchlistCategory): string {
  return WATCHLIST_CATEGORY_LABELS[category];
}

export function isWatchlistCategory(value: string): value is WatchlistCategory {
  return WATCHLIST_CATEGORIES.includes(value as WatchlistCategory);
}

export function normalizeWatchlistCategory(
  value: string | null | undefined
): WatchlistCategory | null {
  if (!value) return null;
  const key = legacyCategoryKey(value);
  return (
    LEGACY_CATEGORY_MAP[key] ??
    LEGACY_CATEGORY_MAP[value.trim()] ??
    LEGACY_CATEGORY_MAP[value.trim().toLowerCase()] ??
    (isWatchlistCategory(value.trim()) ? value.trim() : null)
  );
}

export function getAllDefaultWatchlistTickers(): string[] {
  const tickers = new Set<string>();
  for (const category of WATCHLIST_CATEGORIES) {
    for (const seed of WATCHLIST_CATEGORY_DEFAULTS[category]) {
      tickers.add(seed.ticker);
    }
  }
  return [...tickers];
}

export function resolveDefaultCategory(
  ticker: string
): WatchlistCategory | null {
  const normalized = ticker.trim().toUpperCase();
  for (const category of WATCHLIST_CATEGORIES) {
    if (
      WATCHLIST_CATEGORY_DEFAULTS[category].some(
        (s) => s.ticker.toUpperCase() === normalized
      )
    ) {
      return category;
    }
  }
  return null;
}

export function resolveDefaultPriorityRank(
  ticker: string,
  category: WatchlistCategory
): number {
  const normalized = ticker.trim().toUpperCase();
  const seed = WATCHLIST_CATEGORY_DEFAULTS[category].find(
    (s) => s.ticker.toUpperCase() === normalized
  );
  return seed?.priorityRank ?? 999;
}

export function resolveWatchlistCategory(
  ticker: string,
  storedCategory?: string | null
): WatchlistCategory {
  const normalized = normalizeWatchlistCategory(storedCategory ?? undefined);
  if (normalized) return normalized;
  return resolveDefaultCategory(ticker) ?? "PULLBACK";
}

export function buildDefaultWatchlistSeeds(): {
  ticker: string;
  category: WatchlistCategory;
  priorityRank: number;
  sortOrder: number;
}[] {
  const seeds: {
    ticker: string;
    category: WatchlistCategory;
    priorityRank: number;
    sortOrder: number;
  }[] = [];

  let sortOrder = 0;
  for (const category of WATCHLIST_CATEGORIES) {
    for (const seed of WATCHLIST_CATEGORY_DEFAULTS[category]) {
      seeds.push({
        ticker: seed.ticker,
        category,
        priorityRank: seed.priorityRank,
        sortOrder: sortOrder++,
      });
    }
  }

  return seeds;
}
