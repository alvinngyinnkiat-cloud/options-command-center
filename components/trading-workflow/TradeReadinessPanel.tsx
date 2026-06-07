import type { TradeReadinessResult } from "@/lib/trading-workflow/types";
import { cn } from "@/lib/utils";

interface TradeReadinessPanelProps {
  readiness: TradeReadinessResult;
}

function labelClass(label: TradeReadinessResult["label"]): string {
  switch (label) {
    case "Ready To Trade":
      return "text-gain";
    case "Strong But Review":
      return "text-accent";
    case "Watch":
      return "text-warn";
    case "Do Not Trade":
      return "text-loss";
  }
}

export function TradeReadinessPanel({ readiness }: TradeReadinessPanelProps) {
  return (
    <div className="rounded-lg border border-terminal-border bg-terminal-elevated p-4 space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-[10px] uppercase tracking-wider text-terminal-muted">
            Trade Readiness — {readiness.ticker}
          </p>
          <p className={cn("text-2xl font-semibold font-mono", labelClass(readiness.label))}>
            {readiness.score}
            <span className="text-sm text-terminal-muted">/100</span>
          </p>
        </div>
        <div className="text-right">
          <p className={cn("text-sm font-semibold", labelClass(readiness.label))}>
            {readiness.label}
          </p>
          <p className="text-xs text-terminal-muted mt-1">
            {readiness.finalRecommendation}
          </p>
        </div>
      </div>
      <ul className="space-y-1">
        {readiness.checks.map((check) => (
          <li
            key={check.id}
            className={cn(
              "flex items-center justify-between text-xs py-0.5",
              check.passed ? "text-terminal-muted" : "text-loss"
            )}
          >
            <span>
              {check.passed ? "✓" : "✗"} {check.label}
            </span>
            <span className="text-[10px] truncate max-w-[45%] text-right">
              {check.detail}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
