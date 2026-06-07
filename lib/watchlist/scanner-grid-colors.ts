import type { AnalysisSentiment } from "./analysis-card";
import type { DecisionLabel } from "./scoring/types";

export function sentimentClass(sentiment: AnalysisSentiment): string {
  switch (sentiment) {
    case "bullish":
      return "text-profit";
    case "bearish":
      return "text-loss";
    case "neutral":
      return "text-warning";
  }
}

export function strategyClass(strategy: string): string {
  switch (strategy) {
    case "Bull Put":
      return "text-profit";
    case "Bear Call":
      return "text-loss";
    case "Iron Condor":
      return "text-warning";
    default:
      return "text-terminal-muted";
  }
}

export function actionClass(action: string): string {
  switch (action) {
    case "Trade Immediately":
    case "Strong Candidate":
      return "text-profit";
    case "Watchlist":
      return "text-warning";
    case "No Trade":
      return "text-terminal-muted";
    default:
      return "text-terminal-muted";
  }
}

export function decisionClass(label: DecisionLabel | null): string {
  if (!label) return "text-terminal-muted";
  return actionClass(label);
}

export function scoreClass(score: number | null, max: number): string {
  if (score == null) return "text-terminal-muted";
  if (score >= max) return "text-profit";
  if (score === 0) return "text-loss";
  return "text-warning";
}

export function passFailClass(passed: boolean): string {
  return passed ? "text-profit" : "text-loss";
}

export function changePctClass(value: number): string {
  if (value > 0) return "text-profit";
  if (value < 0) return "text-loss";
  return "text-warning";
}
