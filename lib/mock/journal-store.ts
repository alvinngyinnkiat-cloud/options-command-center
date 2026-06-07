import type { TradingJournalEntry } from "@/types/database";
import { MOCK_JOURNAL_ENTRIES } from "./journal-entries";

let mockJournal: TradingJournalEntry[] = [...MOCK_JOURNAL_ENTRIES];

export function getMockJournalEntries(): TradingJournalEntry[] {
  return [...mockJournal];
}

export function upsertMockJournalEntry(row: TradingJournalEntry): TradingJournalEntry {
  const idx = mockJournal.findIndex((e) => e.id === row.id);
  if (idx >= 0) {
    mockJournal[idx] = {
      ...row,
      created_at: mockJournal[idx].created_at,
      updated_at: new Date().toISOString(),
    };
    return mockJournal[idx];
  }
  mockJournal.push(row);
  return row;
}

export function deleteMockJournalEntry(id: string): boolean {
  const before = mockJournal.length;
  mockJournal = mockJournal.filter((e) => e.id !== id);
  return mockJournal.length < before;
}

export function countJournalByTradeId(tradeId: string): number {
  return mockJournal.filter((e) => e.trade_id === tradeId).length;
}

export function resetMockJournalEntries(): void {
  mockJournal = [...MOCK_JOURNAL_ENTRIES];
}
