import type { AveragePricePosition } from "@/lib/watchlist/types";
import { cn } from "@/lib/utils";

interface AveragePricePositionCellProps {
  position: AveragePricePosition;
  className?: string;
}

const zoneStyles = {
  support: "text-profit bg-profit/10 border-profit/30",
  mid: "text-warning bg-warning/10 border-warning/30",
  resistance: "text-loss bg-loss/10 border-loss/30",
} as const;

export function AveragePricePositionCell({
  position,
  className,
}: AveragePricePositionCellProps) {
  if (position.positionPct == null || position.zone == null) {
    return <span className={cn("text-terminal-muted", className)}>—</span>;
  }

  return (
    <span
      className={cn(
        "inline-flex items-center rounded border px-1.5 py-0.5 font-mono text-[11px]",
        zoneStyles[position.zone],
        className
      )}
      title={`${position.positionPct.toFixed(1)}% of S/R range (0% support → 100% resistance)`}
    >
      {position.label}
    </span>
  );
}
