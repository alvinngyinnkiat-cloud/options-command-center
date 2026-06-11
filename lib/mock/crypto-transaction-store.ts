import type { CryptoTransaction } from "@/types/database";
import { MOCK_USER_ID } from "@/lib/supabase/resolve-user";

let mockTransactions: CryptoTransaction[] = [];

export function getMockCryptoTransactions(): CryptoTransaction[] {
  return [...mockTransactions].sort(
    (a, b) =>
      b.transaction_date.localeCompare(a.transaction_date) ||
      b.created_at.localeCompare(a.created_at)
  );
}

export function insertMockCryptoTransaction(
  row: CryptoTransaction
): CryptoTransaction {
  mockTransactions.push(row);
  return row;
}

export function deleteMockCryptoTransaction(id: string): boolean {
  const before = mockTransactions.length;
  mockTransactions = mockTransactions.filter((tx) => tx.id !== id);
  return mockTransactions.length < before;
}

export function resetMockCryptoTransactions(): void {
  mockTransactions = [];
}

export function seedMockCryptoTransactions(rows: CryptoTransaction[]): void {
  mockTransactions = [...rows];
}

export function mockUserId(): string {
  return MOCK_USER_ID;
}
