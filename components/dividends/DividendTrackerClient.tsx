"use client";

import { useState } from "react";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { PageHeader } from "@/components/ui/PageHeader";
import { StatCard } from "@/components/ui/StatCard";
import {
  deleteDividend,
  syncDividendsFromApi,
} from "@/app/actions/dividend-records";
import type { DividendRecordView, DividendTrackerData } from "@/lib/dividends/types";
import { formatSGD } from "@/lib/utils";
import { Plus, RefreshCw, Trash2, Pencil } from "lucide-react";
import { notifyDividendDataUpdated } from "@/lib/dividends/sync-events";
import { DividendFormModal } from "./DividendFormModal";

interface DividendTrackerClientProps {
  initialData: DividendTrackerData;
}

function RecordTable({
  title,
  records,
  onEdit,
  onDelete,
}: {
  title: string;
  records: DividendRecordView[];
  onEdit: (r: DividendRecordView) => void;
  onDelete: (r: DividendRecordView) => void;
}) {
  if (records.length === 0) {
    return (
      <div className="rounded-lg border border-terminal-border p-4">
        <h3 className="text-xs font-medium uppercase tracking-wider text-terminal-muted mb-2">
          {title}
        </h3>
        <p className="text-sm text-terminal-muted">No records.</p>
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-terminal-border overflow-x-auto">
      <h3 className="px-4 pt-3 text-xs font-medium uppercase tracking-wider text-terminal-muted">
        {title}
      </h3>
      <table className="w-full min-w-[900px] text-xs mt-2">
        <thead className="bg-terminal-elevated/40 border-y border-terminal-border">
          <tr className="text-terminal-muted">
            {[
              "Ticker",
              "Category",
              "Ex-Date",
              "Pay Date",
              "DPS",
              "Net",
              "SGD",
              "Source",
              "Status",
              "",
            ].map((h) => (
              <th key={h} className="px-2 py-2 text-left font-medium">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {records.map((r) => (
            <tr key={r.id} className="border-b border-terminal-border/50">
              <td className="px-2 py-2 font-mono font-semibold">{r.ticker}</td>
              <td className="px-2 py-2">{r.categoryLabel}</td>
              <td className="px-2 py-2 font-mono">{r.exDividendDate ?? "—"}</td>
              <td className="px-2 py-2 font-mono">{r.paymentDate ?? "—"}</td>
              <td className="px-2 py-2 font-mono">
                {r.currency} {r.dividendPerShare.toFixed(4)}
              </td>
              <td className="px-2 py-2 font-mono">
                {r.currency} {r.netDividend.toFixed(2)}
              </td>
              <td className="px-2 py-2 font-mono">{formatSGD(r.sgdEquivalent)}</td>
              <td className="px-2 py-2">
                {r.source}
                {r.isManualOverride && (
                  <span className="ml-1 text-accent">*</span>
                )}
              </td>
              <td className="px-2 py-2">{r.status}</td>
              <td className="px-2 py-2">
                <div className="flex gap-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 w-7 p-0"
                    onClick={() => onEdit(r)}
                  >
                    <Pencil className="h-3.5 w-3.5" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 w-7 p-0 text-loss"
                    onClick={() => onDelete(r)}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function DividendTrackerClient({ initialData }: DividendTrackerClientProps) {
  const [data, setData] = useState(initialData);
  const [formRecord, setFormRecord] = useState<
    DividendRecordView | null | undefined
  >(undefined);
  const [syncing, setSyncing] = useState(false);

  async function handleSync() {
    setSyncing(true);
    const result = await syncDividendsFromApi();
    setSyncing(false);
    if (result.success) {
      setData(result.data);
      notifyDividendDataUpdated();
    }
  }

  async function handleDelete(record: DividendRecordView) {
    if (!confirm(`Delete dividend for ${record.ticker}?`)) return;
    const result = await deleteDividend(record.id);
    if (result.success) {
      setData(result.data);
      notifyDividendDataUpdated();
    }
  }

  function handleSaved(data: DividendTrackerData) {
    setData(data);
    notifyDividendDataUpdated();
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Dividend Tracker"
        description="Automated dividend calendar with manual override — My portfolio only"
        actions={
          <>
            <Badge
              variant={data.dataSource === "supabase" ? "success" : "outline"}
            >
              {data.dataSource === "supabase" ? "Live data" : "Mock data"}
            </Badge>
            <Badge variant="outline">Provider: {data.providerSource}</Badge>
            <Button
              variant="secondary"
              size="sm"
              onClick={handleSync}
              disabled={syncing}
            >
              <RefreshCw className={`h-4 w-4 ${syncing ? "animate-spin" : ""}`} />
              Sync from API
            </Button>
            <Button variant="primary" size="sm" onClick={() => setFormRecord(null)}>
              <Plus className="h-4 w-4" />
              Add Dividend
            </Button>
          </>
        }
      />

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatCard
          label="YTD Net Dividends"
          value={formatSGD(data.summary.totalNetDividendsYtd)}
          change="All markets"
          changeType="neutral"
        />
        <StatCard
          label="US Dividends YTD"
          value={formatSGD(data.summary.usNetDividendsYtd)}
          change="ETF + Stock"
          changeType="neutral"
        />
        <StatCard
          label="SG Dividends YTD"
          value={formatSGD(data.summary.sgNetDividendsYtd)}
          change="Stock + REIT"
          changeType="neutral"
        />
        <StatCard
          label="Upcoming"
          value={String(data.summary.upcoming.length)}
          change="Estimated payments"
          changeType="neutral"
        />
      </div>

      <RecordTable
        title="Upcoming Dividends"
        records={data.summary.upcoming}
        onEdit={setFormRecord}
        onDelete={handleDelete}
      />

      <RecordTable
        title="Received Dividends"
        records={data.summary.received}
        onEdit={setFormRecord}
        onDelete={handleDelete}
      />

      {data.yieldRanking.length > 0 && (
        <div className="rounded-lg border border-terminal-border p-4">
          <h3 className="text-xs font-medium uppercase tracking-wider text-terminal-muted mb-3">
            Dividend Yield Ranking
          </h3>
          <div className="space-y-2">
            {data.yieldRanking.slice(0, 10).map((r) => (
              <div
                key={r.ticker}
                className="flex justify-between text-sm font-mono"
              >
                <span>
                  {r.ticker}{" "}
                  <span className="text-terminal-muted text-xs">
                    {r.categoryLabel}
                  </span>
                </span>
                <span>
                  {r.dividendYieldPct.toFixed(2)}% · {formatSGD(r.annualIncome)}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      <p className="text-[11px] text-terminal-muted">
        * Manual override — API sync will not overwrite edited records. Gross =
        DPS × Shares. Net = Gross − Withholding. SG stocks: dividends only (no
        options premium).
      </p>

      {formRecord !== undefined && (
        <DividendFormModal
          record={formRecord}
          onClose={() => setFormRecord(undefined)}
          onSaved={handleSaved}
        />
      )}
    </div>
  );
}
