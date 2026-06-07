import type { ScannerAction } from "@/types/database";
import type { DecisionLabel } from "./types";

export function getDecisionLabel(totalScore: number): DecisionLabel {
  if (totalScore >= 90) return "Trade Immediately";
  if (totalScore >= 80) return "Strong Candidate";
  if (totalScore >= 70) return "Watchlist";
  return "No Trade";
}

export function decisionToAction(label: DecisionLabel): ScannerAction {
  switch (label) {
    case "Trade Immediately":
      return "enter";
    case "Strong Candidate":
      return "hold";
    case "Watchlist":
      return "watch";
    case "No Trade":
      return "avoid";
  }
}

export function formatStrategyLabel(strategy: string): string {
  switch (strategy) {
    case "bull_put_spread":
      return "Bull Put";
    case "bear_call_spread":
      return "Bear Call";
    case "iron_condor":
      return "Iron Condor";
    default:
      return strategy;
  }
}
