import { randomUUID } from "crypto";
import type { DividendRecordRow } from "@/types/database";

function seedMockRecords(): DividendRecordRow[] {
  const now = new Date().toISOString();
  return [
    {
      id: randomUUID(),
      user_id: "mock-user",
      holding_id: null,
      ticker: "SPY",
      market: "US",
      category: "us_etf",
      ex_dividend_date: "2025-12-20",
      record_date: "2025-12-21",
      payment_date: "2026-01-31",
      dividend_per_share: 1.63,
      shares_held: 50,
      gross_dividend: 81.5,
      withholding_tax: 12.23,
      net_dividend: 69.27,
      currency: "USD",
      sgd_equivalent: 93.5,
      fx_rate_to_sgd: 1.35,
      source: "broker",
      status: "received",
      is_manual_override: false,
      is_received: true,
      notes: null,
      api_reference_id: "mock-spy-2025-q4",
      created_at: now,
      updated_at: now,
    },
    {
      id: randomUUID(),
      user_id: "mock-user",
      holding_id: null,
      ticker: "DBS",
      market: "SG",
      category: "sg_stock",
      ex_dividend_date: "2025-11-15",
      record_date: "2025-11-16",
      payment_date: "2025-11-28",
      dividend_per_share: 0.54,
      shares_held: 500,
      gross_dividend: 270,
      withholding_tax: 0,
      net_dividend: 270,
      currency: "SGD",
      sgd_equivalent: 270,
      fx_rate_to_sgd: 1,
      source: "manual",
      status: "received",
      is_manual_override: true,
      is_received: true,
      notes: "Manual entry from broker statement",
      api_reference_id: null,
      created_at: now,
      updated_at: now,
    },
    {
      id: randomUUID(),
      user_id: "mock-user",
      holding_id: null,
      ticker: "SPY",
      market: "US",
      category: "us_etf",
      ex_dividend_date: "2026-03-20",
      record_date: "2026-03-21",
      payment_date: "2026-04-30",
      dividend_per_share: 1.58,
      shares_held: 50,
      gross_dividend: 79,
      withholding_tax: 0,
      net_dividend: 79,
      currency: "USD",
      sgd_equivalent: 106.65,
      fx_rate_to_sgd: 1.35,
      source: "api",
      status: "upcoming",
      is_manual_override: false,
      is_received: false,
      notes: null,
      api_reference_id: "mock-spy-2026-q1",
      created_at: now,
      updated_at: now,
    },
  ];
}

let mockRecords: DividendRecordRow[] = seedMockRecords();

export function getMockDividendRecords(userId: string): DividendRecordRow[] {
  return mockRecords.filter(
    (r) => r.user_id === userId || userId === "mock-user"
  );
}

export function upsertMockDividendRecord(
  row: DividendRecordRow
): DividendRecordRow {
  const idx = mockRecords.findIndex((r) => r.id === row.id);
  const saved = { ...row, updated_at: new Date().toISOString() };
  if (idx >= 0) {
    mockRecords[idx] = { ...saved, created_at: mockRecords[idx].created_at };
    return mockRecords[idx];
  }
  mockRecords.push(saved);
  return saved;
}

export function deleteMockDividendRecord(id: string): boolean {
  const before = mockRecords.length;
  mockRecords = mockRecords.filter((r) => r.id !== id);
  return mockRecords.length < before;
}

export function findMockByApiRef(
  userId: string,
  apiReferenceId: string
): DividendRecordRow | undefined {
  return mockRecords.find(
    (r) =>
      r.user_id === userId &&
      r.api_reference_id === apiReferenceId
  );
}
