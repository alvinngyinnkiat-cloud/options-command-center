export type WatchlistCategory =
  | "ETF"
  | "Sector Leader"
  | "Top 7"
  | "Pullbacks";

export const WATCHLIST_CATEGORIES: WatchlistCategory[] = [
  "ETF",
  "Sector Leader",
  "Top 7",
  "Pullbacks",
];

export const WATCHLIST_CATEGORY_DEFAULTS: Record<
  WatchlistCategory,
  readonly string[]
> = {
  ETF: ["XSP", "SPY", "QQQ", "IWM", "GLD"],
  "Sector Leader": ["JPM", "XOM", "WMT", "CAT", "UNH", "HD"],
  "Top 7": ["AVGO", "AMZN", "META", "GOOGL", "MSFT", "AAPL", "NVDA"],
  Pullbacks: [],
};

export function getAllDefaultWatchlistTickers(): string[] {
  const tickers = new Set<string>();
  for (const category of WATCHLIST_CATEGORIES) {
    if (category === "Pullbacks") continue;
    for (const ticker of WATCHLIST_CATEGORY_DEFAULTS[category]) {
      tickers.add(ticker);
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
        (t) => t.toUpperCase() === normalized
      )
    ) {
      return category;
    }
  }
  return null;
}

export function resolveWatchlistCategory(
  ticker: string,
  storedCategory?: WatchlistCategory | null
): WatchlistCategory {
  if (storedCategory) return storedCategory;
  return resolveDefaultCategory(ticker) ?? "Pullbacks";
}

export function buildDefaultWatchlistSeeds(): {
  ticker: string;
  category: WatchlistCategory;
  sortOrder: number;
}[] {
  const seeds: { ticker: string; category: WatchlistCategory; sortOrder: number }[] =
    [];

  for (const category of WATCHLIST_CATEGORIES) {
    if (category === "Pullbacks") continue;
    WATCHLIST_CATEGORY_DEFAULTS[category].forEach((ticker, index) => {
      seeds.push({ ticker, category, sortOrder: index });
    });
  }

  return seeds;
}
