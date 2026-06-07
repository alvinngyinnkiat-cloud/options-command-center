import type { RiskAlert } from "@/lib/risk/types";
import { cn } from "@/lib/utils";
import { AlertTriangle, Info, ShieldAlert } from "lucide-react";

interface RiskAlertsPanelProps {
  alerts: RiskAlert[];
}

function severityIcon(severity: RiskAlert["severity"]) {
  switch (severity) {
    case "danger":
      return ShieldAlert;
    case "warning":
      return AlertTriangle;
    default:
      return Info;
  }
}

function severityClass(severity: RiskAlert["severity"]): string {
  switch (severity) {
    case "danger":
      return "border-loss/40 bg-loss/10 text-loss";
    case "warning":
      return "border-warning/40 bg-warning/10 text-warning";
    default:
      return "border-accent/40 bg-accent/10 text-accent";
  }
}

export function RiskAlertsPanel({ alerts }: RiskAlertsPanelProps) {
  if (alerts.length === 0) {
    return (
      <div className="rounded-lg border border-terminal-border bg-terminal-elevated/30 px-4 py-3 text-xs text-terminal-muted">
        No active risk warnings.
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {alerts.map((alert) => {
        const Icon = severityIcon(alert.severity);
        return (
          <div
            key={`${alert.code}-${alert.ticker ?? "global"}`}
            className={cn(
              "flex gap-3 rounded-lg border px-3 py-2.5 text-xs",
              severityClass(alert.severity)
            )}
          >
            <Icon className="mt-0.5 h-4 w-4 shrink-0" />
            <div>
              <p className="font-medium">{alert.title}</p>
              <p className="mt-0.5 opacity-90">{alert.message}</p>
            </div>
          </div>
        );
      })}
    </div>
  );
}
