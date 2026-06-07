import { buildMockScannerRows } from "@/lib/mock/watchlist-scanner";
import {
  deleteMockTrade,
  getMockTrades,
  upsertMockTrade,
} from "@/lib/mock/trades-store";
import { enrichTrade, type TradeMarketContext } from "@/lib/trades/map-trade";
import { buildTradeTrackerSummary } from "@/lib/trades/summary";
import { resolveUnderlyingCurrentPrices } from "@/lib/trades/underlying-price";
import type { EnrichedTrade, TradeTrackerData } from "@/lib/trades/types";
import { getJournalCountForTrade } from "@/lib/supabase/queries/trading-journal";
import { isSupabaseConfigured } from "@/lib/supabase/is-configured";
import { createClient } from "@/lib/supabase/server";
import type { OptionsTrade } from "@/types/database";

function buildAlertContextByTicker(
  currentPrices: Map<string, number>
): Map<string, TradeMarketContext> {
  const map = new Map<string, TradeMarketContext>();
  for (const row of buildMockScannerRows()) {
    const ticker = row.ticker.toUpperCase();
    map.set(ticker, {
      underlyingAveragePrice: row.market.averagePrice,
      underlyingCurrentPrice:
        currentPrices.get(ticker) ?? row.market.currentPrice,
      manualSupport: row.supportResistance.support1,
      manualResistance: row.supportResistance.resistance1,
      atr14: row.technicals.atr14,
    });
  }
  return map;
}

async function enrichAll(
  rows: OptionsTrade[],
  dataSource: "supabase" | "mock",
  userId?: string
): Promise<TradeTrackerData> {
  const tickers = rows.map((row) => row.ticker);
  const currentPrices = await resolveUnderlyingCurrentPrices(tickers, userId);
  const alertContextByTicker = buildAlertContextByTicker(currentPrices);
  const trades: EnrichedTrade[] = await Promise.all(
    rows.map(async (row) => {
      const journalEntryCount = await getJournalCountForTrade(row.id);
      return enrichTrade(row, {
        ...(alertContextByTicker.get(row.ticker.toUpperCase()) ?? {
          underlyingCurrentPrice: currentPrices.get(row.ticker.toUpperCase()) ?? null,
        }),
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

export async function getOptionsTradesData(): Promise<TradeTrackerData> {
  if (!isSupabaseConfigured()) {
    return enrichAll(getMockTrades(), "mock");
  }

  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return enrichAll(getMockTrades(), "mock");
    }

    const { data, error } = await supabase
      .from("options_trades")
      .select("*")
      .eq("user_id", user.id)
      .order("expiration_date", { ascending: true });

    if (error || !data?.length) {
      return enrichAll(getMockTrades(), "mock");
    }

    return enrichAll(data as OptionsTrade[], "supabase", user.id);
  } catch {
    return enrichAll(getMockTrades(), "mock");
  }
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
  if (!isSupabaseConfigured() || !userId) {
    return getMockTrades().find((t) => t.id === tradeId) ?? null;
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("options_trades")
    .select("*")
    .eq("id", tradeId)
    .eq("user_id", userId)
    .maybeSingle();

  if (error || !data) {
    return getMockTrades().find((t) => t.id === tradeId) ?? null;
  }

  return data as OptionsTrade;
}

export async function persistOptionsTrade(
  trade: OptionsTrade,
  userId?: string
): Promise<OptionsTrade> {
  if (!isSupabaseConfigured() || !userId) {
    return upsertMockTrade({ ...trade, user_id: userId ?? "mock-user" });
  }

  const supabase = await createClient();
  const { data: existing } = await supabase
    .from("options_trades")
    .select("id, created_at")
    .eq("id", trade.id)
    .maybeSingle();

  const payload = {
    ...trade,
    created_at: existing
      ? (existing as { created_at: string }).created_at
      : trade.created_at,
    updated_at: new Date().toISOString(),
  };

  const { error } = await supabase
    .from("options_trades")
    .upsert(payload as never);

  if (error) throw new Error(error.message);
  return payload;
}

export async function removeOptionsTrade(
  id: string,
  userId?: string
): Promise<void> {
  if (!isSupabaseConfigured() || !userId) {
    deleteMockTrade(id);
    return;
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("options_trades")
    .delete()
    .eq("id", id)
    .eq("user_id", userId);

  if (error) throw new Error(error.message);
}
