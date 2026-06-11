import { defaultCashBalances } from "@/lib/stocks-etfs/cash-balances";
import { deriveTradingCashFromPortfolio } from "@/lib/stocks-etfs/trading-cash-sync";
import type { MarketCategory } from "@/lib/stocks-etfs/market-category";
import { MOCK_PORTFOLIO_OVERRIDE } from "@/lib/mock/portfolio";
import type { StockEtfCashBalance, StockEtfLedgerEntry } from "@/types/database";
import { MOCK_USER_ID } from "@/lib/supabase/resolve-user";

function seedMockCashFromPortfolio(): StockEtfCashBalance[] {
  const derived = deriveTradingCashFromPortfolio(MOCK_PORTFOLIO_OVERRIDE);
  return defaultCashBalances(MOCK_USER_ID).map((row) => ({
    ...row,
    cash_native: derived[row.market_category as MarketCategory],
  }));
}

let mockCash: StockEtfCashBalance[] = seedMockCashFromPortfolio();
let mockLedger: StockEtfLedgerEntry[] = [];

export function getMockStockEtfCashBalances(): StockEtfCashBalance[] {
  return [...mockCash];
}

export function upsertMockStockEtfCashBalance(
  row: StockEtfCashBalance
): StockEtfCashBalance {
  const idx = mockCash.findIndex(
    (r) =>
      r.user_id === row.user_id && r.market_category === row.market_category
  );
  if (idx >= 0) {
    mockCash[idx] = { ...row, updated_at: new Date().toISOString() };
    return mockCash[idx];
  }
  mockCash.push(row);
  return row;
}

export function getMockStockEtfLedger(): StockEtfLedgerEntry[] {
  return [...mockLedger].sort(
    (a, b) =>
      b.transaction_date.localeCompare(a.transaction_date) ||
      b.created_at.localeCompare(a.created_at)
  );
}

export function insertMockStockEtfLedgerEntry(
  row: StockEtfLedgerEntry
): StockEtfLedgerEntry {
  mockLedger.push(row);
  return row;
}

export function deleteMockStockEtfLedgerEntry(id: string): boolean {
  const before = mockLedger.length;
  mockLedger = mockLedger.filter((e) => e.id !== id);
  return mockLedger.length < before;
}

export function resetMockStockEtfCash(): void {
  mockCash = seedMockCashFromPortfolio();
  mockLedger = [];
}
