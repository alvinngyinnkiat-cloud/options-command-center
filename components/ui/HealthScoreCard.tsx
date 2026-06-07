import { Badge } from "./Badge";
import { Card, CardContent } from "./Card";

interface HealthScoreCardProps {
  score: number;
  maxScore?: number;
  status: string;
  factors: { label: string; value: string; status: "good" | "warn" | "neutral" }[];
}

const factorStyles = {
  good: "text-profit",
  warn: "text-warning",
  neutral: "text-terminal-muted",
};

export function HealthScoreCard({
  score,
  maxScore = 100,
  status,
  factors,
}: HealthScoreCardProps) {
  const pct = Math.min(100, Math.round((score / maxScore) * 100));

  return (
    <Card variant="elevated" className="h-full">
      <CardContent className="py-4">
        <div className="flex items-center justify-between">
          <p className="text-xs font-medium uppercase tracking-wider text-terminal-muted">
            Portfolio Health Score
          </p>
          <Badge variant="outline">Placeholder</Badge>
        </div>

        <div className="mt-3 flex items-end gap-2">
          <span className="font-mono text-3xl font-semibold text-terminal-text tabular-nums">
            {score}
          </span>
          <span className="mb-1 font-mono text-sm text-terminal-muted">
            / {maxScore}
          </span>
        </div>

        <p className="mt-1 text-xs text-terminal-muted">{status}</p>

        <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-terminal-border">
          <div
            className="h-full rounded-full bg-accent transition-all"
            style={{ width: `${pct}%` }}
          />
        </div>

        <ul className="mt-4 space-y-2">
          {factors.map((factor) => (
            <li
              key={factor.label}
              className="flex items-center justify-between text-xs"
            >
              <span className="text-terminal-muted">{factor.label}</span>
              <span className={factorStyles[factor.status]}>{factor.value}</span>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}
