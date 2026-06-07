"use client";

import { useState } from "react";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { PageHeader } from "@/components/ui/PageHeader";
import {
  refreshAutoWatchlistHealth,
  refreshDividendDataHealth,
  refreshMarketDataHealth,
  refreshTechnicalIndicatorsHealth,
  runFullDataHealthCheck,
} from "@/app/actions/data-health";
import type { DataHealthPageData } from "@/lib/data-health/types";
import { RefreshCw } from "lucide-react";
import { DataHealthStatusBadge } from "./DataHealthStatusBadge";
import { DataSourceHealthCard } from "./DataSourceHealthCard";

interface DataHealthClientProps {
  initialData: DataHealthPageData;
}

export function DataHealthClient({ initialData }: DataHealthClientProps) {
  const [data, setData] = useState(initialData);
  const [busy, setBusy] = useState<string | null>(null);

  async function run(
    key: string,
    action: () => Promise<{ success: boolean; data?: DataHealthPageData; error?: string }>
  ) {
    setBusy(key);
    const result = await action();
    setBusy(null);
    if (result.success && result.data) {
      setData(result.data);
    } else if (!result.success) {
      alert(result.error ?? "Action failed.");
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Data Source Health Check"
        description="Verify auto-updates and manual inputs — API keys stay server-side only"
        actions={
          <>
            <Badge variant={data.supabaseConfigured ? "success" : "outline"}>
              {data.supabaseConfigured ? "Supabase connected" : "Mock mode"}
            </Badge>
            <Button
              variant="primary"
              size="sm"
              disabled={busy != null}
              onClick={() => run("full", runFullDataHealthCheck)}
            >
              <RefreshCw
                className={`h-4 w-4 ${busy === "full" ? "animate-spin" : ""}`}
              />
              Run Full Health Check
            </Button>
          </>
        }
      />

      <div className="flex flex-wrap gap-2">
        <Button
          variant="secondary"
          size="sm"
          disabled={busy != null}
          onClick={() => run("market", refreshMarketDataHealth)}
        >
          Refresh Market Data
        </Button>
        <Button
          variant="secondary"
          size="sm"
          disabled={busy != null}
          onClick={() => run("indicators", refreshTechnicalIndicatorsHealth)}
        >
          Refresh Technical Indicators
        </Button>
        <Button
          variant="secondary"
          size="sm"
          disabled={busy != null}
          onClick={() => run("watchlist", refreshAutoWatchlistHealth)}
        >
          Refresh Auto Watchlist
        </Button>
        <Button
          variant="secondary"
          size="sm"
          disabled={busy != null}
          onClick={() => run("dividends", refreshDividendDataHealth)}
        >
          Refresh Dividend Data
        </Button>
      </div>

      <p className="text-[11px] text-terminal-muted">
        Manual data (support/resistance, portfolio values, contributions) is never
        auto-refreshed. Support and resistance remain manual only.
      </p>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2 xl:grid-cols-3">
        {data.reports.map((report) => (
          <DataSourceHealthCard key={report.id} report={report} />
        ))}
      </div>

      <section className="space-y-3">
        <h2 className="text-xs font-medium uppercase tracking-wider text-terminal-muted">
          Data Source Log
        </h2>
        <div className="overflow-x-auto rounded-lg border border-terminal-border">
          <table className="w-full min-w-[800px] text-xs">
            <thead className="bg-terminal-elevated/40 border-b border-terminal-border">
              <tr className="text-terminal-muted text-left">
                {[
                  "Source",
                  "Started",
                  "Completed",
                  "Status",
                  "Updated",
                  "Failed",
                  "Error",
                ].map((h) => (
                  <th key={h} className="px-3 py-2 font-medium">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {data.logs.map((log) => (
                <tr
                  key={log.id}
                  className="border-b border-terminal-border/50"
                >
                  <td className="px-3 py-2 font-mono">{log.sourceName}</td>
                  <td className="px-3 py-2 font-mono">
                    {log.startedAt.slice(0, 19).replace("T", " ")}
                  </td>
                  <td className="px-3 py-2 font-mono">
                    {log.completedAt?.slice(0, 19).replace("T", " ") ?? "—"}
                  </td>
                  <td className="px-3 py-2">
                    <DataHealthStatusBadge
                      status={
                        log.status === "success"
                          ? "healthy"
                          : log.status === "partial"
                            ? "warning"
                            : "failed"
                      }
                    />
                  </td>
                  <td className="px-3 py-2 font-mono">{log.recordsUpdated}</td>
                  <td className="px-3 py-2 font-mono">{log.recordsFailed}</td>
                  <td className="px-3 py-2 text-loss max-w-[200px] truncate">
                    {log.errorMessage ?? "—"}
                  </td>
                </tr>
              ))}
              {data.logs.length === 0 && (
                <tr>
                  <td
                    colSpan={7}
                    className="px-3 py-8 text-center text-terminal-muted"
                  >
                    No refresh attempts logged yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      <p className="text-[10px] text-terminal-muted">
        Last checked: {data.checkedAt.slice(0, 19).replace("T", " ")} UTC
      </p>
    </div>
  );
}
