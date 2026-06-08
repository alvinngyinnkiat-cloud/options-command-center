import { CATEGORY_LABELS } from "@/lib/auto-watchlist/constants";
import { fetchMarketCapUniverse } from "@/lib/auto-watchlist/market-data-service";
import { dbRowToEntry, entryToDbRow } from "@/lib/auto-watchlist/map-result";
import { buildAutoWatchlistCategories } from "@/lib/auto-watchlist/screener";
import type {
  AutoWatchlistCategory,
  AutoWatchlistCategoryId,
  AutoWatchlistPageData,
} from "@/lib/auto-watchlist/types";
import {
  getMockAutoWatchlistResults,
  setMockAutoWatchlistResults,
} from "@/lib/mock/auto-watchlist-store";
import { SCANNER_DEFAULT_TICKERS } from "@/lib/constants/scanner-watchlist";
import { isSupabaseConfigured } from "@/lib/supabase/is-configured";
import {
  MOCK_USER_ID,
  resolveAuthenticatedUserId,
  warnMissingDevUserIdForWrite,
  withSupabaseQuery,
} from "@/lib/supabase/resolve-user";
import type { AutoWatchlistResult } from "@/types/database";

const CATEGORY_ORDER: AutoWatchlistCategoryId[] = [
  "mega_cap_leaders",
  "mega_cap_pullback",
  "large_cap_pullback",
  "mid_large_cap_pullback",
];

async function getManualWatchlistTickers(userId?: string): Promise<string[]> {
  if (!isSupabaseConfigured()) {
    return [...SCANNER_DEFAULT_TICKERS];
  }

  const queryUserId = userId ?? (await resolveAuthenticatedUserId());
  if (!queryUserId) {
    return [...SCANNER_DEFAULT_TICKERS];
  }

  return withSupabaseQuery(
    async ({ userId: effectiveUserId, supabase }) => {
      const { data } = await supabase
        .from("watchlist")
        .select("ticker")
        .eq("user_id", effectiveUserId)
        .eq("is_active", true);

      return (data ?? []).map((r) => (r as { ticker: string }).ticker);
    },
    () => [...SCANNER_DEFAULT_TICKERS]
  );
}

function rowsToCategories(
  rows: AutoWatchlistResult[]
): { categories: AutoWatchlistCategory[]; generatedAt: string | null } {
  if (rows.length === 0) {
    return { categories: [], generatedAt: null };
  }

  const generatedAt = rows[0].generated_at;
  const categories = CATEGORY_ORDER.map((id) => {
    const entries = rows
      .filter((r) => r.category === id)
      .sort((a, b) => a.rank - b.rank)
      .map(dbRowToEntry);

    return {
      id,
      title: CATEGORY_LABELS[id].title,
      description: CATEGORY_LABELS[id].description,
      entries,
    };
  });

  return { categories, generatedAt };
}

function buildPageData(
  categories: AutoWatchlistCategory[],
  generatedAt: string | null,
  manualWatchlistTickers: string[],
  dataSource: "supabase" | "mock",
  marketDataSource: "mock" | "api"
): AutoWatchlistPageData {
  return {
    categories,
    generatedAt,
    manualWatchlistTickers,
    dataSource,
    marketDataSource,
  };
}

export async function refreshAutoWatchlist(
  userId?: string
): Promise<AutoWatchlistPageData> {
  const { snapshots, source: marketDataSource } =
    await fetchMarketCapUniverse();
  const generatedAt = new Date().toISOString();
  const categories = buildAutoWatchlistCategories(snapshots, generatedAt);
  const flat = categories.flatMap((c) => c.entries);
  const manualWatchlistTickers = await getManualWatchlistTickers(userId);

  if (!isSupabaseConfigured()) {
    const rows = flat.map((e) => entryToDbRow(e, MOCK_USER_ID));
    setMockAutoWatchlistResults(rows);
    return buildPageData(
      categories,
      generatedAt,
      manualWatchlistTickers,
      "mock",
      marketDataSource
    );
  }

  return withSupabaseQuery(
    async ({ userId: effectiveUserId, supabase }) => {
      await supabase
        .from("auto_watchlist_results")
        .delete()
        .eq("user_id", effectiveUserId);

      const dbRows = flat.map((e) => entryToDbRow(e, effectiveUserId));
      if (dbRows.length > 0) {
        const { error } = await supabase
          .from("auto_watchlist_results")
          .insert(dbRows as never);

        if (error) throw new Error(error.message);
      }

      return buildPageData(
        categories,
        generatedAt,
        manualWatchlistTickers,
        "supabase",
        marketDataSource
      );
    },
    () => {
      warnMissingDevUserIdForWrite();
      const rows = flat.map((e) => entryToDbRow(e, MOCK_USER_ID));
      setMockAutoWatchlistResults(rows);
      return buildPageData(
        categories,
        generatedAt,
        manualWatchlistTickers,
        "mock",
        marketDataSource
      );
    }
  );
}

export async function getAutoWatchlistPageData(): Promise<AutoWatchlistPageData> {
  if (!isSupabaseConfigured()) {
    const existing = getMockAutoWatchlistResults();
    const manualWatchlistTickers = await getManualWatchlistTickers();

    if (existing.length > 0) {
      const { categories, generatedAt } = rowsToCategories(existing);
      return buildPageData(
        categories,
        generatedAt,
        manualWatchlistTickers,
        "mock",
        "mock"
      );
    }

    return refreshAutoWatchlist();
  }

  try {
    const userId = await resolveAuthenticatedUserId();
    if (!userId) {
      const manualWatchlistTickers = await getManualWatchlistTickers();
      return buildPageData([], null, manualWatchlistTickers, "supabase", "mock");
    }

    return withSupabaseQuery(
      async ({ userId: queryUserId, supabase }) => {
        const { data, error } = await supabase
          .from("auto_watchlist_results")
          .select("*")
          .eq("user_id", queryUserId)
          .order("category")
          .order("rank", { ascending: true });

        const manualWatchlistTickers = await getManualWatchlistTickers(queryUserId);

        if (error || !data?.length) {
          return refreshAutoWatchlist(queryUserId);
        }

        const { categories, generatedAt } = rowsToCategories(
          data as AutoWatchlistResult[]
        );

        return buildPageData(
          categories,
          generatedAt,
          manualWatchlistTickers,
          "supabase",
          "mock"
        );
      },
      async () => refreshAutoWatchlist()
    );
  } catch {
    return refreshAutoWatchlist();
  }
}
