import type {
  ClientProfileRecord,
  ClientTradeAllocation,
} from "@/types/database";
import {
  MOCK_PROFIT_SHARING_ALLOCATIONS,
  MOCK_PROFIT_SHARING_CLIENTS,
} from "./client-profit-sharing";

let mockClients: ClientProfileRecord[] = [...MOCK_PROFIT_SHARING_CLIENTS];
let mockAllocations: ClientTradeAllocation[] = [
  ...MOCK_PROFIT_SHARING_ALLOCATIONS,
];

export function getMockProfitSharingClients(): ClientProfileRecord[] {
  return [...mockClients];
}

export function getMockProfitSharingAllocations(): ClientTradeAllocation[] {
  return [...mockAllocations];
}

export function upsertMockProfitSharingClient(
  row: ClientProfileRecord
): ClientProfileRecord {
  const idx = mockClients.findIndex((c) => c.id === row.id);
  if (idx >= 0) {
    mockClients[idx] = {
      ...row,
      created_at: mockClients[idx].created_at,
      updated_at: new Date().toISOString(),
    };
    return mockClients[idx];
  }
  mockClients.push(row);
  return row;
}

export function deleteMockProfitSharingClient(id: string): boolean {
  const before = mockClients.length;
  mockClients = mockClients.filter((c) => c.id !== id);
  mockAllocations = mockAllocations.filter((a) => a.client_id !== id);
  return mockClients.length < before;
}

export function setMockTradeAllocation(
  row: ClientTradeAllocation
): ClientTradeAllocation {
  const idx = mockAllocations.findIndex(
    (a) =>
      a.client_id === row.client_id &&
      a.options_trade_id === row.options_trade_id
  );
  if (idx >= 0) {
    mockAllocations[idx] = {
      ...row,
      id: mockAllocations[idx].id,
      created_at: mockAllocations[idx].created_at,
      updated_at: new Date().toISOString(),
    };
    return mockAllocations[idx];
  }
  mockAllocations.push(row);
  return row;
}

export function getMockTradeAllocationByTradeId(
  tradeId: string
): ClientTradeAllocation | undefined {
  return mockAllocations.find((a) => a.options_trade_id === tradeId);
}

export function removeMockTradeAllocation(tradeId: string): void {
  mockAllocations = mockAllocations.filter(
    (a) => a.options_trade_id !== tradeId
  );
}

export function recordMockClientPayment(
  clientId: string,
  amount: number
): ClientProfileRecord | null {
  const idx = mockClients.findIndex((c) => c.id === clientId);
  if (idx < 0) return null;
  mockClients[idx] = {
    ...mockClients[idx],
    total_paid_to_client: mockClients[idx].total_paid_to_client + amount,
    updated_at: new Date().toISOString(),
  };
  return mockClients[idx];
}
