import { cn } from "@/lib/utils";
import { BarChart3, Calculator, RefreshCw, Target } from "lucide-react";

interface WeekendReviewWorkflowStepsProps {
  lastRunComplete?: boolean;
}

const STEPS = [
  {
    id: "market",
    title: "Market Data Refresh",
    description:
      "Refresh close, high, low, average price, previous day average, and change %.",
    icon: RefreshCw,
  },
  {
    id: "indicators",
    title: "Technical Indicators",
    description: "Refresh ATR, EMA, SMA, and stochastic readings.",
    icon: BarChart3,
  },
  {
    id: "scores",
    title: "Score Recalculation",
    description: "Recalculate scanner scores from average price and manual S/R.",
    icon: Calculator,
  },
  {
    id: "strategy",
    title: "Strategy Recommendation Refresh",
    description:
      "Rebuild Bull Put, Bear Call, Iron Condor, and No Trade opportunity lists.",
    icon: Target,
  },
] as const;

export function WeekendReviewWorkflowSteps({
  lastRunComplete = false,
}: WeekendReviewWorkflowStepsProps) {
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
      {STEPS.map((step) => {
        const Icon = step.icon;
        return (
          <div
            key={step.id}
            className={cn(
              "rounded-lg border px-3 py-3",
              lastRunComplete
                ? "border-profit/30 bg-profit/5"
                : "border-terminal-border bg-terminal-elevated/20"
            )}
          >
            <div className="flex items-center gap-2">
              <Icon
                className={cn(
                  "h-4 w-4",
                  lastRunComplete ? "text-profit" : "text-terminal-muted"
                )}
              />
              <h4 className="text-xs font-semibold text-terminal-text">
                {step.title}
              </h4>
            </div>
            <p className="mt-1.5 text-[11px] leading-relaxed text-terminal-muted">
              {step.description}
            </p>
          </div>
        );
      })}
    </div>
  );
}
