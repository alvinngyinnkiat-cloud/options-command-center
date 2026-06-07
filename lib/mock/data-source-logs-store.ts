import type { DataSourceLogRow } from "@/types/database";

let mockLogs: DataSourceLogRow[] = [];

export function getMockDataSourceLogs(userId: string): DataSourceLogRow[] {
  return mockLogs
    .filter((l) => l.user_id === userId)
    .sort(
      (a, b) =>
        new Date(b.started_at).getTime() - new Date(a.started_at).getTime()
    );
}

export function insertMockDataSourceLog(row: DataSourceLogRow): DataSourceLogRow {
  mockLogs = [row, ...mockLogs].slice(0, 200);
  return row;
}

export function clearMockDataSourceLogs(): void {
  mockLogs = [];
}
