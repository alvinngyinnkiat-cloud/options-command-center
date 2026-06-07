import type { CryptoHolding } from "@/types/database";
import { MOCK_CRYPTO_HOLDINGS } from "./crypto-holdings";

let mockCrypto: CryptoHolding[] = [...MOCK_CRYPTO_HOLDINGS];

export function getMockCryptoHoldings(): CryptoHolding[] {
  return [...mockCrypto];
}

export function upsertMockCryptoHolding(row: CryptoHolding): CryptoHolding {
  const idx = mockCrypto.findIndex((h) => h.id === row.id);
  if (idx >= 0) {
    mockCrypto[idx] = {
      ...row,
      created_at: mockCrypto[idx].created_at,
      updated_at: new Date().toISOString(),
    };
    return mockCrypto[idx];
  }
  const byTicker = mockCrypto.findIndex(
    (h) => h.ticker === row.ticker && h.user_id === row.user_id
  );
  if (byTicker >= 0) {
    mockCrypto[byTicker] = {
      ...row,
      id: mockCrypto[byTicker].id,
      created_at: mockCrypto[byTicker].created_at,
      updated_at: new Date().toISOString(),
    };
    return mockCrypto[byTicker];
  }
  mockCrypto.push(row);
  return row;
}

export function deleteMockCryptoHolding(id: string): boolean {
  const before = mockCrypto.length;
  mockCrypto = mockCrypto.filter((h) => h.id !== id);
  return mockCrypto.length < before;
}

export function resetMockCryptoHoldings(): void {
  mockCrypto = [...MOCK_CRYPTO_HOLDINGS];
}
