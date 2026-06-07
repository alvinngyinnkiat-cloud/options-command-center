import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/Card";
import type { GoalProgress } from "@/lib/goals/types";
import {
  formatGoalDateDisplay,
  formatProgressPercent,
  formatSGD,
} from "@/lib/goals/format";
import { cn } from "@/lib/utils";

interface GoalProgressCardProps {
  title: string;
  description: string;
  progress: GoalProgress;
  currentLabel: string;
  targetLabel: string;
}

export function GoalProgressCard({
  title,
  description,
  progress,
  currentLabel,
  targetLabel,
}: GoalProgressCardProps) {
  const pct = Math.min(100, progress.progressPercent);

  return (
    <Card variant="default" className="h-full">
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-end justify-between gap-4">
          <div>
            <p className="text-[10px] uppercase tracking-wider text-terminal-muted">
              {currentLabel}
            </p>
            <p className="font-mono text-2xl font-semibold text-terminal-text">
              {formatSGD(progress.current)}
            </p>
          </div>
          <div className="text-right">
            <p className="text-[10px] uppercase tracking-wider text-terminal-muted">
              {targetLabel}
            </p>
            <p className="font-mono text-lg text-terminal-muted">
              {formatSGD(progress.target)}
            </p>
          </div>
        </div>

        <div>
          <div className="flex items-center justify-between text-xs mb-1.5">
            <span className="text-terminal-muted">Progress</span>
            <span
              className={cn(
                "font-mono font-semibold",
                pct >= 100 ? "text-profit" : "text-accent"
              )}
            >
              {formatProgressPercent(progress.progressPercent)}
            </span>
          </div>
          <div className="h-2 w-full overflow-hidden rounded-full bg-terminal-border">
            <div
              className="h-full rounded-full bg-accent transition-all"
              style={{ width: `${pct}%` }}
            />
          </div>
        </div>

        {progress.estimatedCompletion && (
          <p className="text-xs text-terminal-muted">
            Est. completion:{" "}
            <span className="font-mono text-terminal-text">
              {formatGoalDateDisplay(progress.estimatedCompletion)}
            </span>
          </p>
        )}
      </CardContent>
    </Card>
  );
}
