import { Badge } from "@/components/ui/Badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/Card";
import type { HealthScoreResult } from "@/lib/portfolio/types";
import { cn } from "@/lib/utils";
import { Lightbulb } from "lucide-react";

interface HealthScorePanelProps {
  health: HealthScoreResult;
}

const factorStyles = {
  good: "text-profit",
  warn: "text-warning",
  neutral: "text-terminal-muted",
  bad: "text-loss",
};

export function HealthScorePanel({ health }: HealthScorePanelProps) {
  const pct = Math.min(
    100,
    Math.round((health.score / health.maxScore) * 100)
  );

  return (
    <Card variant="elevated" className="h-full">
      <CardHeader>
        <div className="flex items-center justify-between gap-2">
          <div>
            <CardTitle>Portfolio Health Score</CardTitle>
            <CardDescription>{health.status}</CardDescription>
          </div>
          <Badge
            variant={
              health.score >= 65
                ? "success"
                : health.score >= 50
                  ? "warning"
                  : "danger"
            }
          >
            {health.score}/{health.maxScore}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-end gap-2">
          <span className="font-mono text-4xl font-semibold text-terminal-text tabular-nums">
            {health.score}
          </span>
          <span className="mb-1 font-mono text-sm text-terminal-muted">
            / {health.maxScore}
          </span>
        </div>

        <div className="h-2 w-full overflow-hidden rounded-full bg-terminal-border">
          <div
            className="h-full rounded-full bg-accent transition-all"
            style={{ width: `${pct}%` }}
          />
        </div>

        <div>
          <p className="text-xs font-medium uppercase tracking-wider text-terminal-muted mb-2">
            Score Breakdown
          </p>
          <ul className="space-y-2">
            {health.factors.map((factor) => (
              <li
                key={factor.label}
                className="flex items-center justify-between text-xs"
              >
                <span className="text-terminal-muted">{factor.label}</span>
                <span className={cn(factorStyles[factor.status])}>
                  {factor.value}
                </span>
              </li>
            ))}
          </ul>
        </div>

        <div className="rounded-md border border-terminal-border bg-terminal-elevated p-3">
          <p className="text-xs font-medium text-terminal-text mb-1">
            How it&apos;s calculated
          </p>
          <p className="text-xs text-terminal-muted leading-relaxed">
            {health.explanation}
          </p>
        </div>

        <div>
          <p className="flex items-center gap-1.5 text-xs font-medium uppercase tracking-wider text-terminal-muted mb-2">
            <Lightbulb className="h-3.5 w-3.5" />
            Improvement Suggestions
          </p>
          <ul className="space-y-2">
            {health.suggestions.map((suggestion) => (
              <li
                key={suggestion}
                className="text-xs text-terminal-muted leading-relaxed pl-3 border-l-2 border-accent/30"
              >
                {suggestion}
              </li>
            ))}
          </ul>
        </div>
      </CardContent>
    </Card>
  );
}
