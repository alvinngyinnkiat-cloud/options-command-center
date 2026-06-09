import { describe, expect, it } from "vitest";
import { resolveUnderlyingPriceSnapshots } from "./underlying-price";
import {
  formatUnderlyingPriceSourceLabel,
  isStaleUnderlyingPriceDate,
} from "./underlying-price-types";

describe("underlying price snapshots", () => {
  it("uses mock prices only in mock mode", async () => {
    const snapshots = await resolveUnderlyingPriceSnapshots(
      ["GLD"],
      undefined,
      "mock"
    );
    const gld = snapshots.get("GLD");
    expect(gld?.source).toBe("mock");
    expect(gld?.price).toBeCloseTo(218.4, 1);
    expect(gld?.isUsable).toBe(true);
  });

  it("does not fall back to mock in supabase mode without user", async () => {
    const snapshots = await resolveUnderlyingPriceSnapshots(
      ["GLD"],
      undefined,
      "supabase"
    );
    const gld = snapshots.get("GLD");
    expect(gld?.source).toBe("unavailable");
    expect(gld?.isUsable).toBe(false);
  });

  it("marks market_data mock source as not usable in live mode", () => {
    expect(
      isStaleUnderlyingPriceDate("2026-06-06", new Date("2026-06-08T12:00:00Z"))
    ).toBe(false);
    expect(
      isStaleUnderlyingPriceDate("2026-05-01", new Date("2026-06-08T12:00:00Z"))
    ).toBe(true);
  });

  it("formats price source labels", () => {
    expect(formatUnderlyingPriceSourceLabel("market_data")).toBe("Market Data");
    expect(formatUnderlyingPriceSourceLabel("stock_etf_holdings")).toBe(
      "Stock/ETF Holdings"
    );
    expect(formatUnderlyingPriceSourceLabel("mock")).toBe("Mock Data");
    expect(formatUnderlyingPriceSourceLabel("unavailable")).toBe(
      "Not Available"
    );
  });
});
