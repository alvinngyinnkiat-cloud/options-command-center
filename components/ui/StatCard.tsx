import { cn } from "@/lib/utils";
import { Card, CardContent } from "./Card";

/** Responsive grid for portfolio metric cards — avoids clipping on narrow columns */
export const SUMMARY_METRIC_GRID =
  "grid gap-3 grid-cols-[repeat(auto-fill,minmax(220px,1fr))]";

interface StatCardProps {
  label: string;
  value: string;
  change?: string;
  changeType?: "positive" | "negative" | "neutral";
  valueClassName?: string;
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
  valueClassName,
  className,
}: StatCardProps) {
  return (
    <Card variant="default" className={cn("metric-stat-card min-w-0", className)}>
      <CardContent className="py-4 min-w-0">
        <p className="text-xs font-medium uppercase tracking-wider text-terminal-muted leading-snug break-words">
          {label}
        </p>
        <p
          className={cn(
            "metric-stat-value mt-1 font-mono font-semibold",
            valueClassName ?? "text-terminal-text"
          )}
        >
          {value}
        </p>
        {change && (
          <p
            className={cn(
              "mt-1 text-xs font-medium leading-snug break-words",
              changeStyles[changeType]
            )}
          >
            {change}
          </p>
        )}
      </CardContent>
    </Card>
  );
}
