import { Badge } from "@/components/ui/Badge";
import type { AlertSeverity } from "@/lib/alerts/types";

function variantForSeverity(
  severity: AlertSeverity
): "success" | "danger" | "warning" | "info" | "outline" {
  switch (severity) {
    case "critical":
      return "danger";
    case "warning":
      return "warning";
    case "info":
      return "info";
    default:
      return "outline";
  }
}

interface AlertSeverityBadgeProps {
  severity: AlertSeverity;
}

export function AlertSeverityBadge({ severity }: AlertSeverityBadgeProps) {
  return (
    <Badge variant={variantForSeverity(severity)} className="text-[10px] capitalize">
      {severity}
    </Badge>
  );
}
