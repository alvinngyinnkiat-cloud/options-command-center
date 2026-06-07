import type { EnrichedTrade, TradeTrackerSummary } from "@/lib/trades/types";
import type { ExpectedReturnDashboard } from "./types";

const DISCLAIMER =
  "Projection only — not a guarantee of future options income.";

export function buildExpectedReturnDashboard(
  trades: EnrichedTrade[],
  summary: TradeTrackerSummary
): ExpectedReturnDashboard {
  const open = trades.filter(
    (t) => t.status === "open" || t.status === "managed" || t.status === "closing"
  );
  const closed = trades.filter((t) => t.status === "closed");

  const totalPremiumCollected = open.reduce(
    (s, t) => s + t.calculations.totalPremiumReceived,
    0
  );
  const profitTarget75Pct = totalPremiumCollected * 0.75;
  const currentUnrealizedPnl = open.reduce(
    (s, t) => s + t.calculations.currentPnl,
    0
  );
  const currentRealizedProfit = closed.reduce(
    (s, t) => s + (t.calculations.realizedPnl ?? t.calculations.currentPnl),
    0
  );

  const closedProfits = closed
    .map((t) => t.calculations.realizedPnl ?? t.calculations.currentPnl)
    .filter((p) => p > 0);
  const avgWin =
    closedProfits.length > 0
      ? closedProfits.reduce((s, p) => s + p, 0) / closedProfits.length
      : totalPremiumCollected * 0.5;

  const monthsActive = Math.max(1, estimateMonthsActive(trades));
  const tradesPerMonth = closed.length / monthsActive;
  const expectedMonthlyPremium = totalPremiumCollected / Math.max(open.length, 1);
  const expectedMonthlyProfit = avgWin * Math.max(tradesPerMonth, 1);
  const expectedAnnualizedIncome = expectedMonthlyProfit * 12;

  const estimates = [
    {
      label: "Conservative" as const,
      monthlyProfit: expectedMonthlyProfit * 0.7,
      annualizedIncome: expectedMonthlyProfit * 0.7 * 12,
    },
    {
      label: "Base" as const,
      monthlyProfit: expectedMonthlyProfit,
      annualizedIncome: expectedAnnualizedIncome,
    },
    {
      label: "Aggressive" as const,
      monthlyProfit: expectedMonthlyProfit * 1.3,
      annualizedIncome: expectedMonthlyProfit * 1.3 * 12,
    },
  ];

  return {
    openTradesCount: open.length,
    totalPremiumCollected,
    profitTarget75Pct,
    currentRealizedProfit,
    currentUnrealizedPnl,
    expectedMonthlyPremium,
    expectedMonthlyProfit,
    expectedAnnualizedIncome,
    estimates,
    disclaimer: DISCLAIMER,
  };
}

function estimateMonthsActive(trades: EnrichedTrade[]): number {
  if (trades.length === 0) return 1;
  const dates = trades.map((t) => new Date(t.entryDate).getTime());
  const min = Math.min(...dates);
  const max = Math.max(...dates);
  const months = (max - min) / (1000 * 60 * 60 * 24 * 30);
  return Math.max(1, months);
}
