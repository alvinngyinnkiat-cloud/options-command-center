import type { EnrichedAlert } from "@/lib/alerts/types";
import { cn } from "@/lib/utils";
import { AlertTriangle, Info, ShieldAlert } from "lucide-react";

interface WeekendWorkflowAlertsProps {
  alerts: EnrichedAlert[];
}

function severityClass(severity: EnrichedAlert["severity"]): string {
  switch (severity) {
    case "critical":
      return "border-loss/40 bg-loss/10 text-loss";
    case "warning":
      return "border-warning/40 bg-warning/10 text-warning";
    default:
      return "border-accent/40 bg-accent/10 text-accent";
  }
}

export function WeekendWorkflowAlerts({ alerts }: WeekendWorkflowAlertsProps) {
  const active = alerts.filter((a) => a.status === "active");

  if (active.length === 0) {
    return (
      <p className="text-xs text-terminal-muted rounded-lg border border-terminal-border px-4 py-3">
        No weekend workflow alerts.
      </p>
    );
  }

  return (
    <div className="space-y-2">
      {active.map((alert) => {
        const Icon =
          alert.severity === "critical"
            ? ShieldAlert
            : alert.severity === "warning"
              ? AlertTriangle
              : Info;
        return (
          <div
            key={alert.key}
            className={cn(
              "flex gap-3 rounded-lg border px-3 py-2 text-xs",
              severityClass(alert.severity)
            )}
          >
            <Icon className="mt-0.5 h-4 w-4 shrink-0" />
            <div>
              <p className="font-medium">
                {alert.ticker ? `${alert.ticker}: ` : ""}
                {alert.message}
              </p>
              <p className="mt-0.5 opacity-80">{alert.suggestedAction}</p>
            </div>
          </div>
        );
      })}
    </div>
  );
}
