import { describe, expect, it } from "vitest";
import {
  FmpFetchError,
  isRecoverableFmpFailure,
} from "@/lib/watchlist/market-data-provider";

describe("isRecoverableFmpFailure", () => {
  it("returns true for recoverable FmpFetchError", () => {
    expect(
      isRecoverableFmpFailure(
        new FmpFetchError("FMP premium restriction for QQQ: HTTP 402", true)
      )
    ).toBe(true);
  });

  it("returns false for non-recoverable FmpFetchError", () => {
    expect(
      isRecoverableFmpFailure(new FmpFetchError("Network timeout", false))
    ).toBe(false);
  });

  it("matches premium and empty-data message patterns", () => {
    expect(isRecoverableFmpFailure(new Error("HTTP 403 forbidden"))).toBe(true);
    expect(isRecoverableFmpFailure(new Error("HTTP 429 rate limited"))).toBe(true);
    expect(
      isRecoverableFmpFailure(new Error("Premium Query Parameter: Special Endpoint"))
    ).toBe(true);
    expect(isRecoverableFmpFailure(new Error("FMP returned no daily candles"))).toBe(
      true
    );
  });
});
