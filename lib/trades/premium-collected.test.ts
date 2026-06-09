import { describe, expect, it } from "vitest";
import { MOCK_OPTIONS_TRADES } from "@/lib/mock/options-trades";
import {
  calculateTotalPremiumCollected,
  getTradePremiumCollected,
} from "./premium-collected";
import { enrichTrade, tradeFormInputFromEnriched, tradeRowFromForm } from "./map-trade";
import { calculateExitDebitTotal } from "./exit-debit";
import { buildTradeTrackerSummary } from "./summary";

describe("getTradePremiumCollected", () => {
  it("returns total premium for closed credit spreads", () => {
    const closed = enrichTrade(
      MOCK_OPTIONS_TRADES.find((t) => t.status === "closed")!
    );
    expect(getTradePremiumCollected(closed)).toBe(420);
  });

  it("returns total premium for open credit spreads", () => {
    const open = enrichTrade(
      MOCK_OPTIONS_TRADES.find((t) => t.status === "open")!
    );
    expect(getTradePremiumCollected(open)).toBe(640);
  });
});

describe("calculateTotalPremiumCollected", () => {
  it("sums open and closed trade credits", () => {
    const open = enrichTrade(
      MOCK_OPTIONS_TRADES.find((t) => t.id === "trade-2")!
    );
    const closed = enrichTrade(
      MOCK_OPTIONS_TRADES.find((t) => t.id === "trade-4")!
    );

    open.calculations.totalPremiumReceived = 101;
    closed.calculations.totalPremiumReceived = 113;

    expect(calculateTotalPremiumCollected([open, closed])).toBe(214);
  });

  it("matches trade tracker summary premium total", () => {
    const trades = MOCK_OPTIONS_TRADES.map((row) => enrichTrade(row));
    const summary = buildTradeTrackerSummary(trades);
    expect(calculateTotalPremiumCollected(trades)).toBe(
      summary.totalPremiumCollected
    );
  });
});

describe("close trade persistence", () => {
  it("preserves credit_received when closing a trade", () => {
    const openRow = MOCK_OPTIONS_TRADES.find((t) => t.id === "trade-2")!;
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
