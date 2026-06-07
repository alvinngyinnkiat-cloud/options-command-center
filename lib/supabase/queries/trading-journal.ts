import { buildJournalTrackerSummary } from "@/lib/journal/calculations";
import { enrichJournalEntry } from "@/lib/journal/map-entry";
import type { JournalTrackerData } from "@/lib/journal/types";
import {
  countJournalByTradeId,
  deleteMockJournalEntry,
  getMockJournalEntries,
  upsertMockJournalEntry,
} from "@/lib/mock/journal-store";
import { getMockTrades } from "@/lib/mock/trades-store";
import { enrichTrade } from "@/lib/trades/map-trade";
import type { EnrichedTrade } from "@/lib/trades/types";
import { isSupabaseConfigured } from "@/lib/supabase/is-configured";
import { createClient } from "@/lib/supabase/server";
import type { OptionsTrade, TradingJournalEntry } from "@/types/database";

function buildTradeLookup(trades: OptionsTrade[]): Map<string, EnrichedTrade> {
  return new Map(
    trades.map((row) => [row.id, enrichTrade(row)])
  );
}

function buildData(
  rows: TradingJournalEntry[],
  trades: OptionsTrade[],
  dataSource: "supabase" | "mock"
): JournalTrackerData {
  const tradeById = buildTradeLookup(trades);
  const entries = rows
    .map((row) => enrichJournalEntry(row, tradeById.get(row.trade_id ?? "") ?? null))
    .sort(
      (a, b) =>
        new Date(b.entryDate).getTime() - new Date(a.entryDate).getTime()
    );
  return {
    entries,
    summary: buildJournalTrackerSummary(entries),
    dataSource,
  };
}

async function fetchTradesForJournal(
  userId: string | undefined
): Promise<OptionsTrade[]> {
  if (!isSupabaseConfigured() || !userId) {
    return getMockTrades();
  }

  const supabase = await createClient();
  const { data } = await supabase
    .from("options_trades")
    .select("*")
    .eq("user_id", userId);

  return (data as OptionsTrade[] | null) ?? getMockTrades();
}

export async function getJournalTrackerData(): Promise<JournalTrackerData> {
  if (!isSupabaseConfigured()) {
    return buildData(getMockJournalEntries(), getMockTrades(), "mock");
  }

  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) return buildData(getMockJournalEntries(), getMockTrades(), "mock");

    const [journalRes, trades] = await Promise.all([
      supabase
        .from("trading_journal")
        .select("*")
        .eq("user_id", user.id)
        .order("entry_date", { ascending: false }),
      fetchTradesForJournal(user.id),
    ]);

    if (journalRes.error || !journalRes.data?.length) {
      return buildData(getMockJournalEntries(), trades, "mock");
    }

    return buildData(journalRes.data as TradingJournalEntry[], trades, "supabase");
  } catch {
    return buildData(getMockJournalEntries(), getMockTrades(), "mock");
  }
}

export async function persistJournalEntry(
  row: TradingJournalEntry,
  userId?: string
): Promise<TradingJournalEntry> {
  if (!isSupabaseConfigured() || !userId) {
    return upsertMockJournalEntry({ ...row, user_id: userId ?? "mock-user" });
  }

  const supabase = await createClient();
  const { error } = await supabase.from("trading_journal").upsert(row as never);
  if (error) throw new Error(error.message);
  return row;
}

export async function removeJournalEntry(
  id: string,
  userId?: string
): Promise<void> {
  if (!isSupabaseConfigured() || !userId) {
    deleteMockJournalEntry(id);
    return;
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("trading_journal")
    .delete()
    .eq("id", id)
    .eq("user_id", userId);

  if (error) throw new Error(error.message);
}

export async function getJournalCountForTrade(tradeId: string): Promise<number> {
  if (!isSupabaseConfigured()) {
    return countJournalByTradeId(tradeId);
  }

  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return countJournalByTradeId(tradeId);

    const { count } = await supabase
      .from("trading_journal")
      .select("id", { count: "exact", head: true })
      .eq("user_id", user.id)
      .eq("trade_id", tradeId);

    return count ?? 0;
  } catch {
    return countJournalByTradeId(tradeId);
  }
}
