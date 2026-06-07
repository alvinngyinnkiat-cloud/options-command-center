import { describe, expect, it } from "vitest";
import {
  buildClientTradeAllocation,
  resolveAllocationStatus,
} from "./sync-allocation";
import type { OptionsTrade } from "@/types/database";

function baseTrade(overrides: Partial<OptionsTrade> = {}): OptionsTrade {
  return {
    id: "t1",
    user_id: "u1",
    watchlist_id: "mock-SPY",
    ticker: "SPY",
    strategy: "bull_put_spread",
    status: "open",
    entry_date: "2026-06-01",
    expiration_date: "2026-07-01",
    dte: 30,
    contracts: 1,
    credit_received: 2,
    max_risk: 300,
    current_pnl: 500,
    pnl_percent: 10,
    take_profit_target: 75,
    stop_loss_target: 175,
    short_strike_put: 500,
    long_strike_put: 495,
    short_strike_call: null,
    long_strike_call: null,
    notes: null,
    width: 5,
    current_value: 0,
    exit_debit: null,
    realized_pnl: null,
    buying_power_used: 300,
    breakeven_put: null,
    breakeven_call: null,
    take_profit_price: null,
    stop_loss_price: null,
    trade_score: null,
    recommended_strategy: null,
    confidence_level: null,
    reason_for_entry: null,
    trade_ownership: "client_profit_sharing",
    client_id: "client-1",
    my_profit_share_percent: 60,
    client_profit_share_percent: 40,
    is_client_trade: true,
    created_at: "",
    updated_at: "",
    ...overrides,
  };
}

describe("sync allocation", () => {
  it("creates allocation with zero amounts on new open trade", () => {
    const alloc = buildClientTradeAllocation(
      baseTrade({ current_pnl: 0 }),
      "u1"
    );
    expect(alloc?.trade_profit_loss).toBe(0);
    expect(alloc?.my_share_amount).toBe(0);
    expect(alloc?.client_share_amount).toBe(0);
    expect(alloc?.status).toBe("Open");
  });

  it("splits P/L 60/40 on update", () => {
    const alloc = buildClientTradeAllocation(baseTrade({ current_pnl: 1000 }), "u1");
    expect(alloc?.trade_profit_loss).toBe(1000);
    expect(alloc?.my_share_amount).toBe(600);
    expect(alloc?.client_share_amount).toBe(400);
  });

  it("sets Unpaid when trade closed", () => {
    expect(resolveAllocationStatus("closed")).toBe("Unpaid");
    expect(resolveAllocationStatus("closed", "Paid")).toBe("Paid");
  });

  it("returns null for personal trades", () => {
    const alloc = buildClientTradeAllocation(
      baseTrade({
        is_client_trade: false,
        trade_ownership: "personal",
        client_id: null,
      }),
      "u1"
    );
    expect(alloc).toBeNull();
  });
});
