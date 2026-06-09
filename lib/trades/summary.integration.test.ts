import { describe, expect, it } from "vitest";
import { MOCK_OPTIONS_TRADES } from "@/lib/mock/options-trades";
import { enrichTrade } from "@/lib/trades/map-trade";
import { buildTradeTrackerSummary } from "@/lib/trades/summary";
import { calculateTotalPremiumReceived } from "@/lib/trades/calculations";

describe("buildTradeTrackerSummary with enriched mock trades", () => {
  it("includes closed trade premium in totalPremiumCollected", () => {
    const trades = MOCK_OPTIONS_TRADES.map((row) => enrichTrade(row));
    const summary = buildTradeTrackerSummary(trades);

    const expected = MOCK_OPTIONS_TRADES.reduce(
      (s, row) =>
        s +
        calculateTotalPremiumReceived(
          Number(row.credit_received),
          row.contracts
        ),
      0
    );

    expect(summary.closedTrades).toBe(1);
    expect(summary.totalPremiumCollected).toBe(expected);
    expect(summary.totalPremiumCollected).toBeGreaterThan(
      trades
        .filter((t) => t.status === "open" || t.status === "managed")
        .reduce((s, t) => s + t.calculations.totalPremiumReceived, 0)
    );
  });
});
