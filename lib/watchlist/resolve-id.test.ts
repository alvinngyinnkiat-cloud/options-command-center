import { describe, expect, it } from "vitest";
import {
  isMockWatchlistId,
  mockWatchlistIdForTicker,
} from "@/lib/watchlist/resolve-id";

describe("watchlist resolve-id", () => {
  it("builds mock watchlist ids for offline mode", () => {
    expect(mockWatchlistIdForTicker("gld")).toBe("mock-GLD");
    expect(isMockWatchlistId("mock-GLD")).toBe(true);
    expect(isMockWatchlistId("550e8400-e29b-41d4-a716-446655440000")).toBe(
      false
    );
  });
});
