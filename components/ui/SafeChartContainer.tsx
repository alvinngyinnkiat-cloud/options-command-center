"use client";

import { useSyncExternalStore, type ReactNode } from "react";
import { cn } from "@/lib/utils";

interface SafeChartContainerProps {
  children: ReactNode;
  className?: string;
  height?: number;
  minHeightClass?: string;
  empty?: boolean;
  emptyMessage?: string;
}

export function SafeChartContainer({
  children,
  className,
  height = 224,
  minHeightClass = "min-h-[224px]",
  empty = false,
  emptyMessage = "No chart data available",
}: SafeChartContainerProps) {
  const mounted = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false
  );

  if (empty) {
    return (
      <div
        className={cn(
          "flex w-full items-center justify-center rounded-md border border-dashed border-terminal-border bg-terminal-elevated/40 text-sm text-terminal-muted",
          minHeightClass,
          className
        )}
      >
        {emptyMessage}
      </div>
    );
  }

  if (!mounted) {
    return (
      <div
        className={cn("w-full", minHeightClass, className)}
        style={{ height }}
        aria-hidden="true"
      />
    );
  }

  return (
    <div
      className={cn("w-full", minHeightClass, className)}
      style={{ height }}
    >
      {children}
    </div>
  );
}
