import { Badge } from "@/components/ui/Badge";
import type { AlertStatus } from "@/lib/alerts/types";

function variantForStatus(
  status: AlertStatus
): "success" | "danger" | "warning" | "outline" {
  switch (status) {
    case "active":
      return "warning";
    case "dismissed":
      return "outline";
    case "resolved":
      return "success";
  }
}

interface AlertStatusBadgeProps {
  status: AlertStatus;
}

export function AlertStatusBadge({ status }: AlertStatusBadgeProps) {
  return (
    <Badge variant={variantForStatus(status)} className="text-[10px] capitalize">
      {status}
    </Badge>
  );
}
