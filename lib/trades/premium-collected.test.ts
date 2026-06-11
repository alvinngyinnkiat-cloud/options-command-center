import { describe, expect, it } from "vitest";
import type { OptionsTrade } from "@/types/database";
import {
  calculateTotalPremiumCollected,
  getTradePremiumCollected,
} from "./premium-collected";
import { enrichTrade, tradeFormInputFromEnriched, tradeRowFromForm } from "./map-trade";
import { calculateExitDebitTotal } from "./exit-debit";
import { buildTradeTrackerSummary } from "./summary";

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

describe("getTradePremiumCollected", () => {
  it("returns total premium for closed credit spreads", () => {
    const closed = enrichTrade(
      tradeRow({ id: "closed-1", status: "closed", credit_received: 2.1, contracts: 2 })
    );
    expect(getTradePremiumCollected(closed)).toBe(420);
  });

  it("returns total premium for open credit spreads", () => {
    const open = enrichTrade(
      tradeRow({ id: "open-1", status: "open", credit_received: 3.2, contracts: 2 })
    );
    expect(getTradePremiumCollected(open)).toBe(640);
  });
});

describe("calculateTotalPremiumCollected", () => {
  it("sums open and closed trade credits", () => {
    const open = enrichTrade(tradeRow({ id: "trade-2", status: "open" }));
    const closed = enrichTrade(tradeRow({ id: "trade-4", status: "closed" }));

    open.calculations.totalPremiumReceived = 101;
    closed.calculations.totalPremiumReceived = 113;

    expect(calculateTotalPremiumCollected([open, closed])).toBe(214);
  });

  it("matches trade tracker summary premium total", () => {
    const trades = [
      enrichTrade(tradeRow({ id: "open-1", status: "open", credit_received: 3.2, contracts: 2 })),
      enrichTrade(tradeRow({ id: "closed-1", status: "closed", credit_received: 2.1, contracts: 2 })),
    ];
    const summary = buildTradeTrackerSummary(trades);
    expect(calculateTotalPremiumCollected(trades)).toBe(
      summary.totalPremiumCollected
    );
  });
});

describe("close trade persistence", () => {
  it("preserves credit_received when closing a trade", () => {
    const openRow = tradeRow({ id: "trade-2", status: "open" });
    const enriched = enrichTrade(openRow);
    const input = tradeFormInputFromEnriched(enriched);
    input.status = "closed";
    input.currentValue = 0;
    input.exitDebit = calculateExitDebitTotal(0.5, input.contracts);

    const closedRow = tradeRowFromForm(input, "user-1", openRow.id, openRow);

    expect(Number(closedRow.credit_received)).toBe(Number(openRow.credit_received));

    const reEnriched = enrichTrade(closedRow);
    expect(getTradePremiumCollected(reEnriched)).toBe(
      getTradePremiumCollected(enriched)
    );
  });
});
