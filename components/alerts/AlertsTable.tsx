"use client";

import { useState } from "react";
import {
  dismissAlert,
  reactivateAlert,
  resolveAlert,
} from "@/app/actions/alerts";
import { Button } from "@/components/ui/Button";
import type { AlertCategory, EnrichedAlert } from "@/lib/alerts/types";
import { AlertSeverityBadge } from "./AlertSeverityBadge";
import { AlertStatusBadge } from "./AlertStatusBadge";

interface AlertsTableProps {
  alerts: EnrichedAlert[];
  onUpdated: () => void;
  filterType?: AlertCategory | "all";
}

const TYPE_LABELS: Record<AlertCategory, string> = {
  scanner: "Scanner",
  price: "Price",
  trade: "Trade Management",
  risk: "Risk",
  weekend: "Weekend Review",
};

export function AlertsTable({
  alerts,
  onUpdated,
  filterType = "all",
}: AlertsTableProps) {
  const [busyKey, setBusyKey] = useState<string | null>(null);

  const filtered =
    filterType === "all"
      ? alerts
      : alerts.filter((a) => a.alertType === filterType);

  async function runAction(
    key: string,
    fn: (key: string) => Promise<unknown>
  ) {
    setBusyKey(key);
    await fn(key);
    setBusyKey(null);
    onUpdated();
  }

  if (filtered.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-terminal-border p-8 text-center text-sm text-terminal-muted">
        No alerts in this category.
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-lg border border-terminal-border">
      <table className="w-full min-w-[960px] text-xs">
        <thead>
          <tr className="border-b border-terminal-border bg-terminal-elevated/80 text-left uppercase tracking-wider text-terminal-muted">
            <th className="px-3 py-2.5 font-medium">Type</th>
            <th className="px-3 py-2.5 font-medium">Ticker</th>
            <th className="px-3 py-2.5 font-medium">Severity</th>
            <th className="px-3 py-2.5 font-medium">Message</th>
            <th className="px-3 py-2.5 font-medium">Suggested Action</th>
            <th className="px-3 py-2.5 font-medium">Status</th>
            <th className="px-3 py-2.5 font-medium">Created</th>
            <th className="px-3 py-2.5 font-medium">Actions</th>
          </tr>
        </thead>
        <tbody>
          {filtered.map((alert) => (
            <tr
              key={alert.key}
              className="border-b border-terminal-border/50 hover:bg-terminal-elevated/30"
            >
              <td className="px-3 py-2.5 text-terminal-muted">
                {TYPE_LABELS[alert.alertType]}
              </td>
              <td className="px-3 py-2.5 font-mono font-semibold text-terminal-text">
                {alert.ticker ?? "—"}
              </td>
              <td className="px-3 py-2.5">
                <AlertSeverityBadge severity={alert.severity} />
              </td>
              <td className="max-w-md px-3 py-2.5 text-terminal-text leading-relaxed">
                {alert.message}
              </td>
              <td className="px-3 py-2.5 text-terminal-muted whitespace-nowrap">
                {alert.suggestedAction}
              </td>
              <td className="px-3 py-2.5">
                <AlertStatusBadge status={alert.status} />
              </td>
              <td className="px-3 py-2.5 font-mono text-terminal-muted">
                {alert.createdDate}
              </td>
              <td className="px-3 py-2.5">
                <div className="flex gap-1">
                  {alert.status === "active" && (
                    <>
                      <Button
                        variant="ghost"
                        size="sm"
                        disabled={busyKey === alert.key}
                        onClick={() => runAction(alert.key, dismissAlert)}
                      >
                        Dismiss
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        disabled={busyKey === alert.key}
                        onClick={() => runAction(alert.key, resolveAlert)}
                      >
                        Resolve
                      </Button>
                    </>
                  )}
                  {alert.status !== "active" && (
                    <Button
                      variant="ghost"
                      size="sm"
                      disabled={busyKey === alert.key}
                      onClick={() => runAction(alert.key, reactivateAlert)}
                    >
                      Reactivate
                    </Button>
                  )}
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
