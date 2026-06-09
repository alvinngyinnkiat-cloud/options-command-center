import { cn } from "@/lib/utils";
import { METRIC_CARD_MIN_WIDTH, metricCardGridColumns } from "@/lib/ui/metric-card-standard";

interface MetricCardsGridProps {
  children: React.ReactNode;
  className?: string;
  /** Minimum card width before wrapping. Default {@link METRIC_CARD_MIN_WIDTH}px. */
  minCardWidth?: number;
  gap?: "sm" | "md" | "lg";
}

const gapClass = {
  sm: "gap-2",
  md: "gap-3",
  lg: "gap-4",
} as const;

/**
 * Responsive metric card grid — wraps cards instead of squeezing fixed columns.
 * Uses repeat(auto-fit, minmax(min(100%, 220px), 1fr)) by default.
 */
export function MetricCardsGrid({
  children,
  className,
  minCardWidth = METRIC_CARD_MIN_WIDTH,
  gap = "md",
}: MetricCardsGridProps) {
  return (
    <div
      className={cn("grid", gapClass[gap], className)}
      style={{
        gridTemplateColumns: metricCardGridColumns(minCardWidth),
      }}
    >
      {children}
    </div>
  );
}

export { METRIC_CARD_MIN_WIDTH } from "@/lib/ui/metric-card-standard";
