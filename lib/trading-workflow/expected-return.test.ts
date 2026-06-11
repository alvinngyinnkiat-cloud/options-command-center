import { describe, expect, it } from "vitest";
import type { OptionsTrade } from "@/types/database";
import { enrichTrade } from "@/lib/trades/map-trade";
import { buildTradeTrackerSummary } from "@/lib/trades/summary";
import { buildExpectedReturnDashboard } from "./expected-return";

function tradeRow(
  overrides: Partial<OptionsTrade> & Pick<OptionsTrade, "id" | "status">
): OptionsTrade {
  return {
    id: overrides.id,
    user_id: "user-1",
    watchlist_id: "w1",
    ticker: overrides.ticker ?? "SPY",
    strategy: overrides.strategy ?? "bull_put_spread",
    status: overrides.status,
    entry_date: "2026-06-01",
    expiration_date: "2026-07-18",
    contracts: overrides.contracts ?? 2,
    credit_received: overrides.credit_received ?? 2.1,
    current_value: overrides.current_value ?? 80,
    manual_current_option_value: null,
    system_current_option_value: 0.8,
    current_value_source: "system",
    current_value_updated_at: null,
    exit_debit: overrides.exit_debit ?? null,
    fees_commission: 0,
    broker_realized_pnl: null,
    short_strike_put: 500,
    long_strike_put: 495,
    short_strike_call: null,
    long_strike_call: null,
    take_profit_target_pct: 75,
    stop_loss_target_pct: 175,
    trade_score: null,
    recommended_strategy: null,
    confidence_level: null,
    reason_for_entry: null,
    notes: null,
    trade_ownership: "my_portfolio",
    client_id: null,
    my_profit_share_percent: 100,
    client_profit_share_percent: 0,
    is_client_trade: false,
    sell_call_coverage: null,
    shares_owned: null,
    parent_trade_id: null,
    original_cost: null,
    created_at: "2026-06-01T00:00:00.000Z",
    updated_at: "2026-06-01T00:00:00.000Z",
    ...overrides,
  };
}

describe("buildExpectedReturnDashboard", () => {
  it("uses all-trade premium for Premium Collected, not open-only", () => {
    const rows = [
      tradeRow({ id: "open-1", status: "open", credit_received: 3.2, contracts: 2 }),
      tradeRow({ id: "closed-1", status: "closed", credit_received: 2.1, contracts: 2 }),
    ];
    const trades = rows.map((row) => enrichTrade(row));
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
