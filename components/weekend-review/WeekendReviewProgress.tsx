import { cn } from "@/lib/utils";
import { Check } from "lucide-react";

const STEPS = [
  "Review Status",
  "Update S/R",
  "Run Review",
  "Opportunities",
  "Notes",
] as const;

interface WeekendReviewProgressProps {
  activeStep?: number;
}

export function WeekendReviewProgress({
  activeStep = 0,
}: WeekendReviewProgressProps) {
  return (
    <div className="rounded-lg border border-terminal-border bg-terminal-surface p-4">
      <p className="mb-3 text-[10px] uppercase tracking-wider text-terminal-muted">
        Review Workflow
      </p>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        {STEPS.map((step, index) => {
          const done = index < activeStep;
          const active = index === activeStep;
          return (
            <div key={step} className="flex items-center gap-2 min-w-0">
              <div
                className={cn(
                  "flex h-7 w-7 shrink-0 items-center justify-center rounded-full border text-xs font-semibold",
                  done && "border-profit bg-profit/20 text-profit",
                  active && "border-accent bg-accent/20 text-accent",
                  !done && !active && "border-terminal-border text-terminal-muted"
                )}
              >
                {done ? <Check className="h-3.5 w-3.5" /> : index + 1}
              </div>
              <span
                className={cn(
                  "text-xs truncate",
                  active ? "text-terminal-text font-medium" : "text-terminal-muted"
                )}
              >
                {step}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
