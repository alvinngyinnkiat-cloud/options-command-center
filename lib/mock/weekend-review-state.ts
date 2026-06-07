import type { WeeklyMarketUpdateRecord } from "@/lib/weekend-review/types";

let mockLastReviewDate: string | null = "2026-05-31";
let mockSnapshots: WeeklyMarketUpdateRecord[] = [];

export function getMockWeekendReviewDate(): string | null {
  return mockLastReviewDate;
}

export function setMockWeekendReviewDate(date: string): void {
  mockLastReviewDate = date;
}

export function getMockWeeklyMarketSnapshots(): WeeklyMarketUpdateRecord[] {
  return [...mockSnapshots];
}

export function setMockWeeklyMarketSnapshots(
  snapshots: WeeklyMarketUpdateRecord[]
): void {
  mockSnapshots = snapshots;
}

export function resetMockWeekendReviewState(): void {
  mockLastReviewDate = null;
  mockSnapshots = [];
}
