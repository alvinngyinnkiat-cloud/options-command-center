import type { OptionsTrade } from "@/types/database";
import { MOCK_OPTIONS_TRADES } from "./options-trades";

let mockTrades: OptionsTrade[] = [...MOCK_OPTIONS_TRADES];

export function getMockTrades(): OptionsTrade[] {
  return [...mockTrades];
}

export function setMockTrades(trades: OptionsTrade[]): void {
  mockTrades = trades;
}

export function upsertMockTrade(trade: OptionsTrade): OptionsTrade {
  const idx = mockTrades.findIndex((t) => t.id === trade.id);
  if (idx >= 0) {
    mockTrades[idx] = {
      ...trade,
      created_at: mockTrades[idx].created_at,
      updated_at: new Date().toISOString(),
    };
    return mockTrades[idx];
  }
  mockTrades.push(trade);
  return trade;
}

export function deleteMockTrade(id: string): boolean {
  const before = mockTrades.length;
  mockTrades = mockTrades.filter((t) => t.id !== id);
  return mockTrades.length < before;
}

export function resetMockTrades(): void {
  mockTrades = [...MOCK_OPTIONS_TRADES];
}
