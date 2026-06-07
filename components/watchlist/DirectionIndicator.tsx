import type { Direction } from "@/lib/watchlist/types";
import { formatDirectionLabel } from "@/lib/watchlist/format";
import { cn } from "@/lib/utils";
import { ArrowDown, ArrowRight, ArrowUp } from "lucide-react";

interface DirectionIndicatorProps {
  direction: Direction;
  className?: string;
}

export function DirectionIndicator({ direction, className }: DirectionIndicatorProps) {
  const Icon =
    direction === "up" ? ArrowUp : direction === "down" ? ArrowDown : ArrowRight;

  return (
    <span
      className={cn(
        "inline-flex items-center gap-0.5 font-medium",
        direction === "up" && "text-profit",
        direction === "down" && "text-loss",
        direction === "flat" && "text-terminal-muted",
        className
      )}
    >
      <Icon className="h-3 w-3" />
      {formatDirectionLabel(direction)}
    </span>
  );
}
