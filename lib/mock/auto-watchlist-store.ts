import type { AutoWatchlistEntry } from "@/lib/auto-watchlist/types";
import type { AutoWatchlistResult } from "@/types/database";

let mockResults: AutoWatchlistResult[] = [];

export function getMockAutoWatchlistResults(): AutoWatchlistResult[] {
  return [...mockResults];
}

export function setMockAutoWatchlistResults(
  rows: AutoWatchlistResult[]
): AutoWatchlistResult[] {
  mockResults = [...rows];
  return mockResults;
}

export function resetMockAutoWatchlistResults(): void {
  mockResults = [];
}
