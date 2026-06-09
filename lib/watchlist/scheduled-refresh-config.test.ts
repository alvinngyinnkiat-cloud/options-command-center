import { describe, expect, it } from "vitest";
import {
  describeDataSourceSummary,
  formatSingaporeTimestamp,
  WATCHLIST_REFRESH_CRON_UTC,
  WATCHLIST_REFRESH_CRON_LOCAL,
} from "@/lib/watchlist/scheduled-refresh-config";

describe("scheduled refresh config", () => {
  it("maps 06:00 SGT intent to 22:00 UTC for Vercel", () => {
    expect(WATCHLIST_REFRESH_CRON_LOCAL).toBe("0 6 * * *");
    expect(WATCHLIST_REFRESH_CRON_UTC).toBe("0 22 * * *");
  });

  it("formats timestamps in Singapore time (12-hour)", () => {
    const formatted = formatSingaporeTimestamp("2026-06-08T22:05:00.000Z");
    expect(formatted).toBe("Jun 09, 2026 6:05 AM SGT");
  });

  it("summarizes mixed providers", () => {
    expect(describeDataSourceSummary({ fmpCount: 8, yahooCount: 5 })).toBe(
      "FMP (Yahoo fallback)"
    );
    expect(describeDataSourceSummary({ fmpCount: 13, yahooCount: 0 })).toBe("FMP");
  });
});
