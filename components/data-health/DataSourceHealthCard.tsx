"use client";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/Card";
import { EXCLUDED_SNAPSHOT_DATE } from "@/lib/portfolio/snapshot-history";
import type { DataSourceHealthReport } from "@/lib/data-health/types";
import { formatSgtAuditTimestamp } from "@/lib/time/singapore-time";
import { DataHealthStatusBadge } from "./DataHealthStatusBadge";

function formatHealthTimestamp(value: string | null | undefined): string | null {
  if (!value) return null;
  if (value.startsWith(EXCLUDED_SNAPSHOT_DATE)) return null;
  if (value.startsWith("2099-")) return null;
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return formatSgtAuditTimestamp(`${value}T12:00:00+08:00`);
  }
  return formatSgtAuditTimestamp(value);
}

export function DataSourceHealthCard({
  report,
}: {
  report: DataSourceHealthReport;
}) {
  const lastSuccess = formatHealthTimestamp(report.lastSuccessfulUpdate);
  const lastFailure = formatHealthTimestamp(report.lastFailedUpdate);

  return (
    <Card variant="bordered" className="h-full">
      <CardHeader className="pb-2">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <CardTitle className="text-sm">{report.title}</CardTitle>
          <DataHealthStatusBadge status={report.status} />
        </div>
        <CardDescription>{report.summary}</CardDescription>
      </CardHeader>
      <CardContent>
        <dl className="space-y-1.5 text-xs">
          {report.details.map((d) => (
            <div key={d.label} className="flex justify-between gap-3">
              <dt className="text-terminal-muted shrink-0">{d.label}</dt>
              <dd className="font-mono text-right text-terminal-text">
                {d.value}
              </dd>
            </div>
          ))}
        </dl>
        {(lastSuccess || lastFailure) && (
          <div className="mt-3 border-t border-terminal-border pt-2 text-[10px] text-terminal-muted space-y-0.5">
            {lastSuccess && <p>Last success: {lastSuccess}</p>}
            {lastFailure && (
              <p className="text-loss">Last failure: {lastFailure}</p>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
