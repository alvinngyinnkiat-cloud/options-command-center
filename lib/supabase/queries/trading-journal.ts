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
import { readSupabasePrimary } from "@/lib/supabase/data-access";
import { isSupabaseConfigured } from "@/lib/supabase/is-configured";
import {
  MOCK_USER_ID,
  warnMissingDevUserIdForWrite,
  withSupabaseQuery,
} from "@/lib/supabase/resolve-user";
import type { ServerSupabaseClient } from "@/lib/supabase/server-write";
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
  userId: string,
  supabase: ServerSupabaseClient
): Promise<OptionsTrade[]> {
  const { data, error } = await supabase
    .from("options_trades")
    .select("*")
    .eq("user_id", userId);

  if (error) return [];
  return (data ?? []) as OptionsTrade[];
}

async function fetchJournalRows(_userId: string): Promise<{
  journal: TradingJournalEntry[];
  trades: OptionsTrade[];
}> {
  return withSupabaseQuery(
    async ({ userId, supabase }) => {
      const [journalRes, trades] = await Promise.all([
        supabase
          .from("trading_journal")
          .select("*")
          .eq("user_id", userId)
          .order("entry_date", { ascending: false }),
        fetchTradesForJournal(userId, supabase),
      ]);

      if (journalRes.error) return { journal: [], trades: [] };
      return {
        journal: (journalRes.data ?? []) as TradingJournalEntry[],
        trades,
      };
    },
    () => ({ journal: [], trades: [] })
  );
}

export async function getJournalTrackerData(): Promise<JournalTrackerData> {
  const { value, dataSource } = await readSupabasePrimary({
    module: "getJournalTrackerData",
    mock: () => buildData([], [], "mock"),
    empty: () => buildData([], [], "supabase"),
    read: async (userId) => {
      const { journal, trades } = await fetchJournalRows(userId);
      return buildData(journal, trades, "supabase");
    },
  });
  return { ...value, dataSource };
}

export async function persistJournalEntry(
  row: TradingJournalEntry,
  userId?: string
): Promise<TradingJournalEntry> {
  if (!isSupabaseConfigured()) {
    return upsertMockJournalEntry({ ...row, user_id: userId ?? MOCK_USER_ID });
  }

  return withSupabaseQuery(
    async ({ userId: effectiveUserId, supabase }) => {
      const { error } = await supabase
        .from("trading_journal")
        .upsert({ ...row, user_id: effectiveUserId } as never);
      if (error) throw new Error(error.message);
      return { ...row, user_id: effectiveUserId };
    },
    () => {
      warnMissingDevUserIdForWrite();
      return upsertMockJournalEntry({ ...row, user_id: MOCK_USER_ID });
    }
  );
}

export async function removeJournalEntry(
  id: string,
  userId?: string
): Promise<void> {
  if (!isSupabaseConfigured()) {
    deleteMockJournalEntry(id);
    return;
  }

  await withSupabaseQuery(
    async ({ userId: effectiveUserId, supabase }) => {
      const { error } = await supabase
        .from("trading_journal")
        .delete()
        .eq("id", id)
        .eq("user_id", effectiveUserId);

      if (error) throw new Error(error.message);
    },
    () => {
      warnMissingDevUserIdForWrite();
      deleteMockJournalEntry(id);
    }
  );
}

export async function getJournalCountForTrade(tradeId: string): Promise<number> {
  if (!isSupabaseConfigured()) {
    return countJournalByTradeId(tradeId);
  }

  return withSupabaseQuery(
    async ({ userId, supabase }) => {
      const { count } = await supabase
        .from("trading_journal")
        .select("id", { count: "exact", head: true })
        .eq("user_id", userId)
        .eq("trade_id", tradeId);

      return count ?? 0;
    },
    () => countJournalByTradeId(tradeId)
  );
}
