import Link from "next/link";
import type { AlertsCenterData } from "@/lib/alerts/types";
import { AlertSeverityBadge } from "./AlertSeverityBadge";

interface AlertsDashboardPanelProps {
  data: AlertsCenterData;
  limit?: number;
}

export function AlertsDashboardPanel({
  data,
  limit = 5,
}: AlertsDashboardPanelProps) {
  const active = data.alerts
    .filter((a) => a.status === "active")
    .slice(0, limit);

  return (
    <div className="rounded-lg border border-terminal-border bg-terminal-surface p-4">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-xs font-medium uppercase tracking-wider text-terminal-muted">
          Active Alerts ({data.summary.active})
        </h2>
        <Link
          href="/alerts"
          className="text-xs text-accent hover:underline"
        >
          View all
        </Link>
      </div>

      {active.length === 0 ? (
        <p className="text-xs text-terminal-muted">No active alerts.</p>
      ) : (
        <ul className="space-y-2">
          {active.map((alert) => (
            <li
              key={alert.key}
              className="flex items-start gap-2 rounded border border-terminal-border/50 px-3 py-2"
            >
              <AlertSeverityBadge severity={alert.severity} />
              <div className="min-w-0 flex-1">
                <p className="text-xs text-terminal-text leading-relaxed">
                  {alert.ticker && (
                    <span className="font-mono font-semibold mr-1">
                      {alert.ticker}
                    </span>
                  )}
                  {alert.message}
                </p>
                <p className="mt-0.5 text-[10px] text-terminal-muted">
                  {alert.suggestedAction}
                </p>
              </div>
            </li>
          ))}
        </ul>
      )}

      {data.summary.critical > 0 && (
        <p className="mt-3 text-[11px] text-loss">
          {data.summary.critical} critical alert
          {data.summary.critical !== 1 ? "s" : ""} require attention
        </p>
      )}
    </div>
  );
}
