import type {
  StockEtfPositionAdjustment,
  StockEtfTransaction,
} from "@/types/database";
import { MOCK_USER_ID } from "@/lib/supabase/resolve-user";

let mockTransactions: StockEtfTransaction[] = [];
let mockAdjustments: StockEtfPositionAdjustment[] = [];

export function getMockStockEtfTransactions(
  holdingId?: string
): StockEtfTransaction[] {
  const rows = [...mockTransactions];
  if (!holdingId) return rows;
  return rows.filter((r) => r.holding_id === holdingId);
}

export function addMockStockEtfTransaction(
  row: StockEtfTransaction
): StockEtfTransaction {
  mockTransactions.push(row);
  return row;
}

export function getMockStockEtfAdjustments(
  holdingId?: string
): StockEtfPositionAdjustment[] {
  const rows = [...mockAdjustments];
  if (!holdingId) return rows;
  return rows.filter((r) => r.holding_id === holdingId);
}

export function addMockStockEtfAdjustment(
  row: StockEtfPositionAdjustment
): StockEtfPositionAdjustment {
  mockAdjustments.push(row);
  return row;
}

export function resetMockStockEtfPositionHistory(): void {
  mockTransactions = [];
  mockAdjustments = [];
}

export function deleteMockStockEtfTransaction(id: string): boolean {
  const before = mockTransactions.length;
  mockTransactions = mockTransactions.filter((r) => r.id !== id);
  return mockTransactions.length < before;
}

export function deleteMockStockEtfTransactionsForHolding(holdingId: string): number {
  const before = mockTransactions.length;
  mockTransactions = mockTransactions.filter((r) => r.holding_id !== holdingId);
  return before - mockTransactions.length;
}

export function deleteMockStockEtfAdjustmentsForHolding(holdingId: string): number {
  const before = mockAdjustments.length;
  mockAdjustments = mockAdjustments.filter((r) => r.holding_id !== holdingId);
  return before - mockAdjustments.length;
}

export function seedMockStockEtfTransaction(
  partial: Omit<StockEtfTransaction, "id" | "created_at" | "updated_at"> & {
    id?: string;
  }
): StockEtfTransaction {
  const now = new Date().toISOString();
  const row: StockEtfTransaction = {
    id: partial.id ?? crypto.randomUUID(),
    user_id: partial.user_id ?? MOCK_USER_ID,
    holding_id: partial.holding_id,
    transaction_type: partial.transaction_type,
    transaction_date: partial.transaction_date,
    shares: partial.shares,
    price_per_share: partial.price_per_share,
    total_amount: partial.total_amount,
    fees: partial.fees,
    notes: partial.notes,
    created_at: now,
    updated_at: now,
  };
  return addMockStockEtfTransaction(row);
}
