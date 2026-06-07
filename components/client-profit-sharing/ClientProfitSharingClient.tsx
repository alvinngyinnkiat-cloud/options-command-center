"use client";

import { Badge } from "@/components/ui/Badge";
import { PageHeader } from "@/components/ui/PageHeader";
import type { ClientProfitSharingData } from "@/lib/client-profit-sharing/types";
import { ClientLifetimeSummary } from "./ClientLifetimeSummary";
import { ClientProfitReportTable } from "./ClientProfitReportTable";
import { ClientProfitSummaryCards } from "./ClientProfitSummaryCards";
import { ClientProfilePanel } from "./ClientProfilePanel";
import { ClientTradeAllocationTable } from "./ClientTradeAllocationTable";

interface ClientProfitSharingClientProps {
  initialData: ClientProfitSharingData;
}

export function ClientProfitSharingClient({
  initialData,
}: ClientProfitSharingClientProps) {
  function handleRefresh() {
    window.location.reload();
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Client Profit Sharing Tracker"
        description="Track client capital on selected options trades — separate from portfolio accounting"
        actions={
          <Badge
            variant={
              initialData.dataSource === "supabase" ? "success" : "outline"
            }
          >
            {initialData.dataSource === "supabase" ? "Live data" : "Mock data"}
          </Badge>
        }
      />

      <div className="rounded-lg border border-terminal-border bg-terminal-elevated/40 px-4 py-3 text-xs text-terminal-muted">
        Client participates in selected trades only · Does not affect Portfolio
        Value, Cash, Risk Capacity, Net Worth, or Financial Goals
      </div>

      <ClientProfitSummaryCards summary={initialData.summary} />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <ClientProfilePanel
          clients={initialData.clients}
          activeClientId={initialData.activeClientId}
          onRefresh={handleRefresh}
        />
        <section>
          <h2 className="mb-3 text-xs font-medium uppercase tracking-wider text-terminal-muted">
            Lifetime Summary
          </h2>
          <ClientLifetimeSummary summary={initialData.summary} />
          <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
            <div className="rounded border border-terminal-border px-2 py-1.5">
              <span className="text-terminal-muted">Client Profit </span>
              <span className="font-mono text-profit">
                ${initialData.summary.totalClientProfit.toFixed(0)}
              </span>
            </div>
            <div className="rounded border border-terminal-border px-2 py-1.5">
              <span className="text-terminal-muted">Client Loss </span>
              <span className="font-mono text-loss">
                ${initialData.summary.totalClientLoss.toFixed(0)}
              </span>
            </div>
          </div>
        </section>
      </div>

      <section>
        <h2 className="mb-3 text-xs font-medium uppercase tracking-wider text-terminal-muted">
          Trade Allocation
        </h2>
        <ClientTradeAllocationTable
          rows={initialData.tradeAllocations}
          activeClientId={initialData.activeClientId}
          onRefresh={handleRefresh}
        />
      </section>

      <section>
        <h2 className="mb-3 text-xs font-medium uppercase tracking-wider text-terminal-muted">
          Per-Trade Report
        </h2>
        <ClientProfitReportTable
          rows={initialData.tradeAllocations}
          onRefresh={handleRefresh}
        />
      </section>
    </div>
  );
}
