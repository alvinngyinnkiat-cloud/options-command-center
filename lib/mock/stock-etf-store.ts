import type { StockEtfHolding } from "@/types/database";
import { MOCK_STOCK_ETF_HOLDINGS } from "./stock-etf-holdings";

let mockStockEtf: StockEtfHolding[] = [...MOCK_STOCK_ETF_HOLDINGS];

export function getMockStockEtfHoldings(): StockEtfHolding[] {
  return [...mockStockEtf];
}

export function upsertMockStockEtfHolding(row: StockEtfHolding): StockEtfHolding {
  const idx = mockStockEtf.findIndex((h) => h.id === row.id);
  if (idx >= 0) {
    mockStockEtf[idx] = {
      ...row,
      created_at: mockStockEtf[idx].created_at,
      updated_at: new Date().toISOString(),
    };
    return mockStockEtf[idx];
  }
  const byTicker = mockStockEtf.findIndex(
    (h) => h.ticker === row.ticker && h.user_id === row.user_id
  );
  if (byTicker >= 0) {
    mockStockEtf[byTicker] = {
      ...row,
      id: mockStockEtf[byTicker].id,
      created_at: mockStockEtf[byTicker].created_at,
      updated_at: new Date().toISOString(),
    };
    return mockStockEtf[byTicker];
  }
  mockStockEtf.push(row);
  return row;
}

export function deleteMockStockEtfHolding(id: string): boolean {
  const before = mockStockEtf.length;
  mockStockEtf = mockStockEtf.filter((h) => h.id !== id);
  return mockStockEtf.length < before;
}

export function resetMockStockEtfHoldings(): void {
  mockStockEtf = [...MOCK_STOCK_ETF_HOLDINGS];
}
