import { cn } from "@/lib/utils";
import { Card, CardContent } from "./Card";

interface StatCardProps {
  label: string;
  value: string;
  change?: string;
  changeType?: "positive" | "negative" | "neutral";
  className?: string;
}

const changeStyles = {
  positive: "text-profit",
  negative: "text-loss",
  neutral: "text-terminal-muted",
};

export function StatCard({
  label,
  value,
  change,
  changeType = "neutral",
  className,
}: StatCardProps) {
  return (
    <Card variant="default" className={cn("overflow-hidden", className)}>
      <CardContent className="py-4">
        <p className="text-xs font-medium uppercase tracking-wider text-terminal-muted">
          {label}
        </p>
        <p className="mt-1 font-mono text-2xl font-semibold text-terminal-text tabular-nums">
          {value}
        </p>
        {change && (
          <p className={cn("mt-1 text-xs font-medium", changeStyles[changeType])}>
            {change}
          </p>
        )}
      </CardContent>
    </Card>
  );
}
