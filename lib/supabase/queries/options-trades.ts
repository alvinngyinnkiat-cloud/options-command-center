import {
  deleteMockTrade,
  getMockTrades,
  upsertMockTrade,
} from "@/lib/mock/trades-store";
import { buildMockScannerRows } from "@/lib/mock/watchlist-scanner";
import { enrichTrade, type TradeMarketContext } from "@/lib/trades/map-trade";
import { buildTradeTrackerSummary } from "@/lib/trades/summary";
import { formatSupabaseError } from "@/lib/trades/server-action-response";
import {
  resolveUnderlyingPriceSnapshots,
  UNAVAILABLE_UNDERLYING_SNAPSHOT,
  type UnderlyingPriceSnapshot,
} from "@/lib/trades/underlying-price";
import type { EnrichedTrade, TradeTrackerData } from "@/lib/trades/types";
import { getJournalCountForTrade } from "@/lib/supabase/queries/trading-journal";
import { readSupabasePrimary } from "@/lib/supabase/data-access";
import { isSupabaseConfigured } from "@/lib/supabase/is-configured";
import {
  MOCK_USER_ID,
  isValidSupabaseUserId,
  warnMissingDevUserIdForWrite,
  withSupabaseQuery,
} from "@/lib/supabase/resolve-user";
import type {
  OptionsTrade,
  SupportResistance,
  TechnicalIndicator,
} from "@/types/database";

function snapshotToMarketContext(
  snap: UnderlyingPriceSnapshot
): Pick<
  TradeMarketContext,
  | "underlyingCurrentPrice"
  | "underlyingPriceSource"
  | "underlyingPriceUpdatedAt"
  | "underlyingPriceUsable"
> {
  return {
    underlyingCurrentPrice: snap.isUsable ? snap.price : null,
    underlyingPriceSource: snap.source,
    underlyingPriceUpdatedAt: snap.updatedAt,
    underlyingPriceUsable: snap.isUsable,
  };
}

async function buildSupabaseAlertContext(
  userId: string
): Promise<Map<string, TradeMarketContext>> {
  if (!isSupabaseConfigured() || !isValidSupabaseUserId(userId)) {
    return new Map();
  }

  try {
    return await withSupabaseQuery(
      async ({ userId: queryUserId, supabase }) => {
        const [srRes, techRes] = await Promise.all([
          supabase
            .from("support_resistance")
            .select("*")
            .eq("user_id", queryUserId)
            .eq("timeframe", "daily"),
          supabase
            .from("technical_indicators")
            .select("*")
            .eq("user_id", queryUserId)
            .order("indicator_date", { ascending: false }),
        ]);

        const srByTicker = new Map<string, SupportResistance>();
        for (const row of (srRes.data ?? []) as SupportResistance[]) {
          srByTicker.set(row.ticker.toUpperCase(), row);
        }

        const atrByTicker = new Map<string, number>();
        for (const row of (techRes.data ?? []) as TechnicalIndicator[]) {
          const ticker = row.ticker.toUpperCase();
          if (!atrByTicker.has(ticker) && row.atr_14 != null) {
            atrByTicker.set(ticker, Number(row.atr_14));
          }
        }

        const map = new Map<string, TradeMarketContext>();
        for (const [ticker, sr] of srByTicker) {
          map.set(ticker, {
            manualSupport: sr.support_1 != null ? Number(sr.support_1) : null,
            manualResistance:
              sr.resistance_1 != null ? Number(sr.resistance_1) : null,
            atr14: atrByTicker.get(ticker) ?? null,
          });
        }

        for (const [ticker, atr] of atrByTicker) {
          if (!map.has(ticker)) {
            map.set(ticker, { atr14: atr });
          }
        }

        return map;
      },
      () => new Map()
    );
  } catch {
    return new Map();
  }
}

function buildMockAlertContext(
  priceSnapshots: Map<string, UnderlyingPriceSnapshot>
): Map<string, TradeMarketContext> {
  const map = new Map<string, TradeMarketContext>();
  for (const row of buildMockScannerRows()) {
    const ticker = row.ticker.toUpperCase();
    const snap =
      priceSnapshots.get(ticker) ??
      ({
        price: row.market.currentPrice,
        source: "mock",
        updatedAt: null,
        isUsable: true,
      } satisfies UnderlyingPriceSnapshot);
    map.set(ticker, {
      ...snapshotToMarketContext(snap),
      underlyingAveragePrice: row.market.averagePrice,
      manualSupport: row.supportResistance.support1,
      manualResistance: row.supportResistance.resistance1,
      atr14: row.technicals.atr14,
    });
  }
  return map;
}

async function fetchTradeRows(_userId: string): Promise<OptionsTrade[]> {
  return withSupabaseQuery(
    async ({ userId, supabase }) => {
      const { data, error } = await supabase
        .from("options_trades")
        .select("*")
        .eq("user_id", userId)
        .order("expiration_date", { ascending: true });

      if (error) return [];
      return (data ?? []) as OptionsTrade[];
    },
    () => []
  );
}

async function enrichAll(
  rows: OptionsTrade[],
  dataSource: "supabase" | "mock",
  userId?: string
): Promise<TradeTrackerData> {
  const tickers = rows.map((row) => row.ticker);
  const priceSnapshots = await resolveUnderlyingPriceSnapshots(
    tickers,
    userId,
    dataSource
  );
  const alertContextByTicker =
    dataSource === "mock"
      ? buildMockAlertContext(priceSnapshots)
      : userId
        ? await buildSupabaseAlertContext(userId)
        : new Map<string, TradeMarketContext>();

  const trades: EnrichedTrade[] = await Promise.all(
    rows.map(async (row) => {
      const ticker = row.ticker.toUpperCase();
      const journalEntryCount = await getJournalCountForTrade(row.id);
      const snap =
        priceSnapshots.get(ticker) ?? UNAVAILABLE_UNDERLYING_SNAPSHOT;
      const alertContext = alertContextByTicker.get(ticker) ?? {};

      return enrichTrade(row, {
        ...alertContext,
        ...snapshotToMarketContext(snap),
        journalEntryCount,
      });
    })
  );
  return {
    trades: trades.sort(
      (a, b) =>
        (a.status === "open" || a.status === "managed" ? 0 : 1) -
          (b.status === "open" || b.status === "managed" ? 0 : 1) ||
        b.calculations.dte - a.calculations.dte ||
        a.ticker.localeCompare(b.ticker)
    ),
    summary: buildTradeTrackerSummary(trades),
    dataSource,
  };
}

export async function enrichOptionsTradeRow(
  row: OptionsTrade,
  dataSource: "supabase" | "mock",
  userId?: string
): Promise<EnrichedTrade> {
  const ticker = row.ticker.toUpperCase();
  const priceSnapshots = await resolveUnderlyingPriceSnapshots(
    [ticker],
    userId,
    dataSource
  );
  const alertContextByTicker =
    dataSource === "mock"
      ? buildMockAlertContext(priceSnapshots)
      : userId
        ? await buildSupabaseAlertContext(userId)
        : new Map<string, TradeMarketContext>();

  const journalEntryCount = await getJournalCountForTrade(row.id);
  const snap =
    priceSnapshots.get(ticker) ?? UNAVAILABLE_UNDERLYING_SNAPSHOT;
  const alertContext = alertContextByTicker.get(ticker) ?? {};

  return enrichTrade(row, {
    ...alertContext,
    ...snapshotToMarketContext(snap),
    journalEntryCount,
  });
}

export async function getOptionsTradesData(): Promise<TradeTrackerData> {
  const { value, dataSource } = await readSupabasePrimary({
    module: "getOptionsTradesData",
    mock: () => enrichAll(getMockTrades(), "mock"),
    empty: (userId) => enrichAll([], "supabase", userId),
    read: async (userId) => enrichAll(await fetchTradeRows(userId), "supabase", userId),
  });
  return { ...value, dataSource };
}

export async function getOptionsTradeById(
  tradeId: string
): Promise<EnrichedTrade | null> {
  const data = await getOptionsTradesData();
  return data.trades.find((t) => t.id === tradeId) ?? null;
}

export async function getOptionsTradeRow(
  tradeId: string,
  userId?: string
): Promise<OptionsTrade | null> {
  if (!isSupabaseConfigured()) {
    return getMockTrades().find((t) => t.id === tradeId) ?? null;
  }

  return withSupabaseQuery(
    async ({ userId: queryUserId, supabase }) => {
      const { data, error } = await supabase
        .from("options_trades")
        .select("*")
        .eq("id", tradeId)
        .eq("user_id", queryUserId)
        .maybeSingle();

      if (error) return null;
      return (data as OptionsTrade | null) ?? null;
    },
    () => getMockTrades().find((t) => t.id === tradeId) ?? null
  );
}

export async function persistOptionsTrade(
  trade: OptionsTrade,
  userId?: string
): Promise<OptionsTrade> {
  if (!isSupabaseConfigured()) {
    return upsertMockTrade({ ...trade, user_id: userId ?? MOCK_USER_ID });
  }

  return withSupabaseQuery(
    async ({ userId: effectiveUserId, supabase }) => {
      const { data: existing } = await supabase
        .from("options_trades")
        .select("id, created_at")
        .eq("id", trade.id)
        .maybeSingle();

      const payload = {
        ...trade,
        user_id: effectiveUserId,
        created_at: existing
          ? (existing as { created_at: string }).created_at
          : trade.created_at,
        updated_at: new Date().toISOString(),
      };

      const { error } = await supabase
        .from("options_trades")
        .upsert(payload as never);

      if (error) {
        throw new Error(formatSupabaseError(error));
      }
      return payload;
    },
    () => {
      warnMissingDevUserIdForWrite();
      return upsertMockTrade({ ...trade, user_id: MOCK_USER_ID });
    }
  );
}

export async function removeOptionsTrade(
  id: string,
  userId?: string
): Promise<void> {
  if (!isSupabaseConfigured()) {
    deleteMockTrade(id);
    return;
  }

  await withSupabaseQuery(
    async ({ userId: effectiveUserId, supabase }) => {
      const { error } = await supabase
        .from("options_trades")
        .delete()
        .eq("id", id)
        .eq("user_id", effectiveUserId);

      if (error) {
        throw new Error(formatSupabaseError(error));
      }
    },
    () => {
      warnMissingDevUserIdForWrite();
      deleteMockTrade(id);
    }
  );
}
