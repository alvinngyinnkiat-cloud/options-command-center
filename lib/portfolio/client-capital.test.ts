import { describe, expect, it } from "vitest";
import {
  buildClientCapitalMetrics,
  calculateTotalAssetsManaged,
} from "./client-capital";
import type { ClientProfitSharingSummary } from "@/lib/client-profit-sharing/types";

function summary(
  partial: Partial<ClientProfitSharingSummary> = {}
): ClientProfitSharingSummary {
  return {
    totalClientCapital: 3_000,
    allocatedTradesCount: 2,
    totalClientProfit: 450,
    totalClientLoss: 0,
    totalClientNetPl: 450,
    totalMySharePl: 675,
    clientShareOwed: 0,
    clientSharePaid: 0,
    totalPaidToClient: 0,
    outstandingAmountOwed: 450,
    lifetimeTradeProfit: 1_125,
    lifetimeClientShare: 450,
    lifetimeMyShare: 675,
    ...partial,
  };
}

describe("client capital metrics", () => {
  it("computes client P/L as current value minus initial capital", () => {
    const metrics = buildClientCapitalMetrics(summary());
    expect(metrics.clientInitialCapital).toBe(3_000);
    expect(metrics.clientPnl).toBe(450);
    expect(metrics.clientCurrentValue).toBe(3_450);
  });

  it("computes client return percentage", () => {
    const metrics = buildClientCapitalMetrics(summary());
    expect(metrics.clientReturnPct).toBe(15);
  });

  it("computes total assets managed", () => {
    expect(calculateTotalAssetsManaged(40_000, 3_450)).toBe(43_450);
  });
});
