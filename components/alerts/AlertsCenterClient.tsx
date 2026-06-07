"use client";

import { useState } from "react";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { PageHeader } from "@/components/ui/PageHeader";
import { StatCard } from "@/components/ui/StatCard";
import type { AlertCategory, AlertsCenterData } from "@/lib/alerts/types";
import { AlertsTable } from "./AlertsTable";

interface AlertsCenterClientProps {
  initialData: AlertsCenterData;
}

const FILTERS: { id: AlertCategory | "all"; label: string }[] = [
  { id: "all", label: "All" },
  { id: "scanner", label: "Scanner" },
  { id: "price", label: "Price" },
  { id: "trade", label: "Trade" },
  { id: "risk", label: "Risk" },
  { id: "weekend", label: "Weekend" },
];

export function AlertsCenterClient({ initialData }: AlertsCenterClientProps) {
  const [data] = useState(initialData);
  const [filter, setFilter] = useState<AlertCategory | "all">("all");

  function handleRefresh() {
    window.location.reload();
  }

  function handleUpdated() {
    handleRefresh();
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Alerts Center"
        description="Scanner, price, trade, risk, and weekend review alerts — Phase 11"
        actions={
          <Badge variant={data.dataSource === "supabase" ? "success" : "outline"}>
            {data.dataSource === "supabase" ? "Live data" : "Mock data"}
          </Badge>
        }
      />

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
        <StatCard label="Active" value={String(data.summary.active)} />
        <StatCard
          label="Critical"
          value={String(data.summary.critical)}
          changeType={data.summary.critical > 0 ? "negative" : "neutral"}
        />
        <StatCard label="Warning" value={String(data.summary.warning)} />
        <StatCard label="Info" value={String(data.summary.info)} />
        <StatCard label="Total" value={String(data.summary.total)} />
      </div>

      <div className="flex flex-wrap gap-2">
        {FILTERS.map((f) => (
          <Button
            key={f.id}
            variant={filter === f.id ? "primary" : "ghost"}
            size="sm"
            onClick={() => setFilter(f.id)}
          >
            {f.label}
            {f.id !== "all" && (
              <span className="ml-1 text-terminal-muted">
                ({data.summary.byType[f.id as AlertCategory]})
              </span>
            )}
          </Button>
        ))}
      </div>

      <AlertsTable
        alerts={data.alerts}
        onUpdated={handleUpdated}
        filterType={filter}
      />

      <p className="text-[11px] text-terminal-muted">
        Average Price used for proximity checks · S/R manual only · Take profit
        75% · Options allocation max 75%
      </p>
    </div>
  );
}
