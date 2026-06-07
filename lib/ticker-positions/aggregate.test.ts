import { describe, expect, it } from "vitest";
import { enrichTrade } from "@/lib/trades/map-trade";
import type { OptionsTrade } from "@/types/database";
import {
  buildTickerPerformanceReport,
  buildTickerPositionSummaries,
} from "./aggregate";
import { calculateAdjustedCostBasis } from "./leaps";

const baseTrade = (
  partial: Partial<OptionsTrade> & Pick<OptionsTrade, "id" | "ticker" | "strategy">
): OptionsTrade =>
  ({
    user_id: "u1",
    watchlist_id: "w1",
    status: "open",
    entry_date: "2026-01-01",
    expiration_date: "2028-01-21",
    dte: 600,
    contracts: 1,
    credit_received: 25,
    max_risk: 7900,
    current_pnl: 0,
    pnl_percent: 0,
    take_profit_target: 75,
    stop_loss_target: 175,
    short_strike_put: null,
    long_strike_put: null,
    short_strike_call: null,
    long_strike_call: 360,
    notes: null,
    width: null,
    current_value: 8500,
    manual_current_option_value: null,
    system_current_option_value: 85,
    current_value_source: "system",
    current_value_updated_at: null,
    exit_debit: null,
    realized_pnl: null,
    buying_power_used: 7900,
    breakeven_put: null,
    breakeven_call: null,
    take_profit_price: null,
    stop_loss_price: null,
    trade_score: null,
    recommended_strategy: null,
    confidence_level: null,
    reason_for_entry: null,
    trade_ownership: "personal",
    client_id: null,
    my_profit_share_percent: 60,
    client_profit_share_percent: 40,
    is_client_trade: false,
    sell_call_coverage: null,
    shares_owned: null,
    parent_trade_id: null,
    original_cost: 7900,
    created_at: "2026-01-01",
    updated_at: "2026-01-01",
    ...partial,
  }) as OptionsTrade;

describe("ticker position aggregation", () => {
  it("calculates adjusted cost basis from child premiums", () => {
    expect(calculateAdjustedCostBasis(7900, 650)).toBe(7250);
  });

  it("aggregates long and income P/L by ticker using My P/L", () => {
    const leaps = enrichTrade(
      baseTrade({
        id: "leaps-1",
        ticker: "AVGO",
        strategy: "leaps",
        original_cost: 7900,
        long_strike_call: 360,
      })
    );
    const cc = enrichTrade(
      baseTrade({
        id: "cc-1",
        ticker: "AVGO",
        strategy: "sell_call",
        sell_call_coverage: "covered",
        expiration_date: "2026-07-18",
        short_strike_call: 400,
        long_strike_call: null,
        credit_received: 3.5,
        original_cost: null,
        parent_trade_id: "leaps-1",
        current_value: 100,
      })
    );
    const bullPut = enrichTrade(
      baseTrade({
        id: "bp-1",
        ticker: "AVGO",
        strategy: "bull_put_spread",
        expiration_date: "2026-06-20",
        short_strike_put: 1600,
        long_strike_put: 1590,
        short_strike_call: null,
        long_strike_call: null,
        credit_received: 2,
        original_cost: null,
        current_value: 50,
      })
    );

    const summaries = buildTickerPositionSummaries([leaps, cc, bullPut]);
    const avgo = summaries.find((s) => s.ticker === "AVGO");
    expect(avgo).toBeDefined();
    expect(avgo!.longTermStrategies).toContain("LEAPS");
    expect(avgo!.incomeStrategies).toContain("Covered Call");
    expect(avgo!.incomeStrategies).toContain("Bull Put");
    expect(avgo!.leapsPositions[0].adjustedCostBasis).toBe(
      7900 - cc.calculations.totalPremiumReceived
    );
    expect(avgo!.totalPnl).toBe(
      avgo!.longPositionPnl + avgo!.incomeTradePnl
    );
  });

  it("builds performance report rankings", () => {
    const a = enrichTrade(
      baseTrade({ id: "a", ticker: "AAPL", strategy: "bull_put_spread", current_value: 10 })
    );
    const b = enrichTrade(
      baseTrade({ id: "b", ticker: "MSFT", strategy: "bear_call_spread", current_value: 200 })
    );
    const summaries = buildTickerPositionSummaries([a, b]);
    const report = buildTickerPerformanceReport(summaries);
    expect(report.topPerformers.length).toBeGreaterThan(0);
    expect(report.premiumByTicker.length).toBe(2);
  });
});
