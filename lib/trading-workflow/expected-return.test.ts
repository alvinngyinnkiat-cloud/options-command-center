import { describe, expect, it } from "vitest";
import { MOCK_OPTIONS_TRADES } from "@/lib/mock/options-trades";
import { enrichTrade } from "@/lib/trades/map-trade";
import { buildTradeTrackerSummary } from "@/lib/trades/summary";
import { buildExpectedReturnDashboard } from "./expected-return";

describe("buildExpectedReturnDashboard", () => {
  it("uses all-trade premium for Premium Collected, not open-only", () => {
    const trades = MOCK_OPTIONS_TRADES.map((row) => enrichTrade(row));
    const summary = buildTradeTrackerSummary(trades);
    const dashboard = buildExpectedReturnDashboard(trades, summary);

    expect(dashboard.totalPremiumCollected).toBe(summary.totalPremiumCollected);
    expect(dashboard.totalPremiumCollected).toBeGreaterThan(
      trades
        .filter(
          (t) =>
            t.status === "open" ||
            t.status === "managed" ||
            t.status === "closing"
        )
        .reduce((s, t) => s + t.calculations.totalPremiumReceived, 0)
    );
  });
});
