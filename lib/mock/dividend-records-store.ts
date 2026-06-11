import type { DividendRecordRow } from "@/types/database";

let mockRecords: DividendRecordRow[] = [];

export function getMockDividendRecords(_userId: string): DividendRecordRow[] {
  return [...mockRecords];
}

export function upsertMockDividendRecord(
  row: DividendRecordRow
): DividendRecordRow {
  const idx = mockRecords.findIndex((r) => r.id === row.id);
  if (idx >= 0) {
    mockRecords[idx] = row;
    return row;
  }
  mockRecords.push(row);
  return row;
}

export function deleteMockDividendRecord(id: string): boolean {
  const before = mockRecords.length;
  mockRecords = mockRecords.filter((r) => r.id !== id);
  return mockRecords.length < before;
}

export function findMockByApiRef(
  _userId: string,
  apiRef: string
): DividendRecordRow | undefined {
  return mockRecords.find((r) => r.api_reference_id === apiRef);
}

export function resetMockDividendRecords(): void {
  mockRecords = [];
}
