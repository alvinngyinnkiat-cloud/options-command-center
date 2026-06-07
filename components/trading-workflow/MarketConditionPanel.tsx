import type { MarketConditionResult } from "@/lib/trading-workflow/types";
import { cn } from "@/lib/utils";

interface MarketConditionPanelProps {
  condition: MarketConditionResult;
  compact?: boolean;
}

function conditionColor(c: MarketConditionResult["condition"]): string {
  switch (c) {
    case "Bullish":
      return "text-gain border-gain/30 bg-gain/5";
    case "Bearish":
      return "text-loss border-loss/30 bg-loss/5";
    case "Neutral":
      return "text-accent border-accent/30 bg-accent/5";
    case "Transition":
      return "text-warn border-warn/30 bg-warn/5";
  }
}

export function MarketConditionPanel({
  condition,
  compact = false,
}: MarketConditionPanelProps) {
  return (
    <div
      className={cn(
        "rounded-lg border p-4",
        conditionColor(condition.condition)
      )}
    >
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <p className="text-[10px] uppercase tracking-wider opacity-70">
            Market Condition
          </p>
          <p className="text-lg font-semibold">{condition.condition}</p>
        </div>
        <div className="text-right">
          <p className="text-[10px] uppercase tracking-wider opacity-70">
            Confidence
          </p>
          <p className="text-lg font-mono">{condition.confidencePct}%</p>
        </div>
      </div>
      <p className="mt-2 text-xs">
        Preferred: <strong>{condition.preferredStrategy}</strong>
      </p>
      <p className="mt-1 text-xs opacity-80">{condition.reason}</p>
      {condition.warning && (
        <p className="mt-2 text-xs font-medium">{condition.warning}</p>
      )}
      {!compact && condition.benchmarkScores.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-2">
          {condition.benchmarkScores.map((b) => (
            <span
              key={b.ticker}
              className="rounded border border-terminal-border/50 px-2 py-0.5 text-[10px] font-mono"
            >
              {b.ticker} SO{b.stochastic.toFixed(0)}
              {b.trendPassed ? " ✓" : ""}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
