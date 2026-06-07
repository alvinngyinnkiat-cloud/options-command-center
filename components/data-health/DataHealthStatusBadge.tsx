import { cn } from "@/lib/utils";
import type { DataSourceHealthStatus } from "@/lib/data-health/types";

const STYLES: Record<
  DataSourceHealthStatus,
  { badge: string; dot: string; label: string }
> = {
  healthy: {
    badge: "bg-profit/15 text-profit border-profit/30",
    dot: "bg-profit",
    label: "Healthy",
  },
  warning: {
    badge: "bg-amber-500/15 text-amber-400 border-amber-500/30",
    dot: "bg-amber-400",
    label: "Warning",
  },
  failed: {
    badge: "bg-loss/15 text-loss border-loss/30",
    dot: "bg-loss",
    label: "Failed",
  },
  manual_required: {
    badge: "bg-accent/15 text-accent border-accent/30",
    dot: "bg-accent",
    label: "Manual Required",
  },
};

export function DataHealthStatusBadge({
  status,
  className,
}: {
  status: DataSourceHealthStatus;
  className?: string;
}) {
  const s = STYLES[status];
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded border px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider",
        s.badge,
        className
      )}
    >
      <span className={cn("h-1.5 w-1.5 rounded-full", s.dot)} />
      {s.label}
    </span>
  );
}
