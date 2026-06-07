import { TRADING_RULES } from "@/lib/constants/trading-rules";
import type { HealthFactor, HealthScoreResult } from "./types";

interface HealthScoreInput {
  portfolioValue: number;
  availableRiskCapacity: number;
  optionsAllocationPct: number;
  openPositionsCount: number;
  expiringThisWeek: number;
  returnPercent: number;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

export function calculateHealthScore(input: HealthScoreInput): HealthScoreResult {
  const maxAllocation = TRADING_RULES.maxOptionsAllocationPercent;
  const riskCapacityUsed =
    input.portfolioValue > 0
      ? ((input.portfolioValue - input.availableRiskCapacity) /
          input.portfolioValue) *
        100
      : 0;

  const allocationScore = clamp(
    100 - Math.abs(input.optionsAllocationPct - maxAllocation * 0.6) * 1.5,
    0,
    100
  );
  const riskScore = clamp(100 - riskCapacityUsed * 0.8, 0, 100);
  const diversificationScore = clamp(
    100 - Math.max(0, input.openPositionsCount - 8) * 5,
    0,
    100
  );
  const dteScore = clamp(100 - input.expiringThisWeek * 15, 0, 100);
  const performanceScore = clamp(50 + input.returnPercent * 0.5, 0, 100);

  const factors: HealthFactor[] = [
    {
      label: "Options Allocation",
      value: `${input.optionsAllocationPct.toFixed(0)}% / ${maxAllocation}% max`,
      status:
        input.optionsAllocationPct <= maxAllocation
          ? input.optionsAllocationPct > maxAllocation * 0.85
            ? "warn"
            : "good"
          : "bad",
      weight: 0.25,
    },
    {
      label: "Risk Capacity",
      value: `${riskCapacityUsed.toFixed(0)}% utilized`,
      status:
        riskCapacityUsed < 70 ? "good" : riskCapacityUsed < 85 ? "warn" : "bad",
      weight: 0.25,
    },
    {
      label: "Diversification",
      value: `${input.openPositionsCount} open positions`,
      status:
        input.openPositionsCount <= 10
          ? "good"
          : input.openPositionsCount <= 15
            ? "warn"
            : "bad",
      weight: 0.2,
    },
    {
      label: "DTE Concentration",
      value: `${input.expiringThisWeek} expiring this week`,
      status:
        input.expiringThisWeek === 0
          ? "good"
          : input.expiringThisWeek <= 2
            ? "warn"
            : "bad",
      weight: 0.15,
    },
    {
      label: "Return Performance",
      value: `${input.returnPercent >= 0 ? "+" : ""}${input.returnPercent.toFixed(1)}%`,
      status:
        input.returnPercent >= 5
          ? "good"
          : input.returnPercent >= 0
            ? "neutral"
            : "warn",
      weight: 0.15,
    },
  ];

  const score = Math.round(
    allocationScore * 0.25 +
      riskScore * 0.25 +
      diversificationScore * 0.2 +
      dteScore * 0.15 +
      performanceScore * 0.15
  );

  const status =
    score >= 80
      ? "Excellent — portfolio within all risk guidelines"
      : score >= 65
        ? "Healthy — within allocation and risk limits"
        : score >= 50
          ? "Fair — review allocation and expiration concentration"
          : "Needs attention — risk limits may be exceeded";

  const explanation =
    "Portfolio Health Score (0–100) weighs options allocation vs. the 75% cap, " +
    "risk capacity utilization, position diversification, near-term expiration " +
    "concentration, and overall return. Higher is better.";

  const suggestions = buildSuggestions(factors);

  return {
    score,
    maxScore: 100,
    status,
    factors: factors.map(({ label, value, status, weight }) => ({
      label,
      value,
      status,
      weight,
    })),
    explanation,
    suggestions,
  };
}

function buildSuggestions(factors: HealthFactor[]): string[] {
  const suggestions: string[] = [];

  for (const factor of factors) {
    if (factor.status === "bad" || factor.status === "warn") {
      switch (factor.label) {
        case "Options Allocation":
          suggestions.push(
            "Reduce options allocation toward 50–65% of portfolio to stay well under the 75% maximum."
          );
          break;
        case "Risk Capacity":
          suggestions.push(
            "Available Risk Capacity is running low — consider closing profitable spreads or reducing new trade size."
          );
          break;
        case "Diversification":
          suggestions.push(
            "High open position count — consolidate overlapping tickers or close weaker setups."
          );
          break;
        case "DTE Concentration":
          suggestions.push(
            "Multiple positions expiring this week — plan rolls or exits to avoid gamma risk."
          );
          break;
        case "Return Performance":
          suggestions.push(
            "Negative return — review stop-loss adherence and avoid averaging down on losing spreads."
          );
          break;
      }
    }
  }

  if (suggestions.length === 0) {
    suggestions.push(
      "Portfolio is well-balanced. Maintain current discipline on 75% TP and 2.5% max risk per trade."
    );
  }

  return suggestions.slice(0, 4);
}
