import { getHighestSeverity } from "@/lib/alerts/summary";
import type { EnrichedAlert } from "@/lib/alerts/types";
import { cn } from "@/lib/utils";
import { AlertTriangle, Info, ShieldAlert } from "lucide-react";

interface AlertWarningIconProps {
  alerts: EnrichedAlert[];
  className?: string;
}

export function AlertWarningIcon({ alerts, className }: AlertWarningIconProps) {
  const severity = getHighestSeverity(alerts);
  if (!severity) return null;

  const Icon =
    severity === "critical"
      ? ShieldAlert
      : severity === "warning"
        ? AlertTriangle
        : Info;

  const colorClass =
    severity === "critical"
      ? "text-loss"
      : severity === "warning"
        ? "text-warning"
        : "text-accent";

  return (
    <span
      className={cn("inline-flex", colorClass, className)}
      title={`${alerts.filter((a) => a.status === "active").length} active alert(s)`}
    >
      <Icon className="h-3.5 w-3.5" />
    </span>
  );
}
