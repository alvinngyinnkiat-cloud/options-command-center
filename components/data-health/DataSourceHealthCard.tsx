"use client";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/Card";
import type { DataSourceHealthReport } from "@/lib/data-health/types";
import { DataHealthStatusBadge } from "./DataHealthStatusBadge";

export function DataSourceHealthCard({
  report,
}: {
  report: DataSourceHealthReport;
}) {
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
        {(report.lastSuccessfulUpdate || report.lastFailedUpdate) && (
          <div className="mt-3 border-t border-terminal-border pt-2 text-[10px] text-terminal-muted space-y-0.5">
            {report.lastSuccessfulUpdate && (
              <p>Last success: {report.lastSuccessfulUpdate.slice(0, 19).replace("T", " ")}</p>
            )}
            {report.lastFailedUpdate && (
              <p className="text-loss">
                Last failure: {report.lastFailedUpdate.slice(0, 19).replace("T", " ")}
              </p>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
