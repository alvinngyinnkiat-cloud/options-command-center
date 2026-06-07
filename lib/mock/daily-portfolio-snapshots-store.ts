import type {
  DailyPortfolioSnapshot as DailyPortfolioSnapshotRow,
  DailyPortfolioSnapshotWrite,
} from "@/types/database";
import { applyMockGeneratedSnapshotColumns } from "@/lib/portfolio/daily-snapshot";

let mockSnapshots: DailyPortfolioSnapshotRow[] = [];

export function getMockDailyPortfolioSnapshots(): DailyPortfolioSnapshotRow[] {
  return [...mockSnapshots];
}

export function upsertMockDailyPortfolioSnapshot(
  row: DailyPortfolioSnapshotWrite
): DailyPortfolioSnapshotRow {
  const stored = applyMockGeneratedSnapshotColumns(row);
  const idx = mockSnapshots.findIndex(
    (s) =>
      s.user_id === stored.user_id && s.snapshot_date === stored.snapshot_date
  );
  if (idx >= 0) {
    mockSnapshots[idx] = {
      ...stored,
      id: mockSnapshots[idx].id,
      created_at: mockSnapshots[idx].created_at,
      notes: stored.notes ?? mockSnapshots[idx].notes,
    };
    return mockSnapshots[idx];
  }
  mockSnapshots.push(stored);
  return stored;
}

export function setMockDailyPortfolioSnapshots(
  rows: DailyPortfolioSnapshotWrite[]
): void {
  mockSnapshots = rows.map((row) => applyMockGeneratedSnapshotColumns(row));
}

export function deleteMockDailyPortfolioSnapshot(id: string): void {
  mockSnapshots = mockSnapshots.filter((s) => s.id !== id);
}

export function updateMockDailyPortfolioSnapshot(
  id: string,
  patch: Partial<DailyPortfolioSnapshotWrite>
): DailyPortfolioSnapshotRow | null {
  const idx = mockSnapshots.findIndex((s) => s.id === id);
  if (idx < 0) return null;
  const next = applyMockGeneratedSnapshotColumns({
    ...mockSnapshots[idx],
    ...patch,
  });
  mockSnapshots[idx] = next;
  return next;
}

export function clearMockDailyPortfolioSnapshots(): void {
  mockSnapshots = [];
}
