"use client";

import { useMemo, useState } from "react";
import { deleteDailyPortfolioRecord } from "@/app/actions/daily-portfolio-records";
import { Button } from "@/components/ui/Button";
import type {
  PortfolioHistoryData,
  PortfolioHistoryTableRow,
} from "@/lib/portfolio/daily-snapshot-types";
import {
  DEFAULT_PORTFOLIO_HISTORY_FILTER,
  loadPortfolioHistoryFilter,
  PORTFOLIO_HISTORY_FILTERS,
  savePortfolioHistoryFilter,
  type PortfolioHistoryFilterId,
} from "@/lib/portfolio/history-preferences";
import {
  buildHistoryTableRows,
  filterRowsByHistoryFilter,
} from "@/lib/portfolio/snapshot-history";
import { MOCK_REFERENCE_DATE } from "@/lib/mock/reference-dates";
import {
  cn,
  formatReturnPercent,
  formatSGD,
  formatSignedSGD,
} from "@/lib/utils";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { PortfolioHistoryFormModal } from "./PortfolioHistoryFormModal";

interface PortfolioHistoryTableProps {
  history: PortfolioHistoryData;
  onHistoryChange: (history: PortfolioHistoryData) => void;
}

function valueCell(value: number | null) {
  if (value == null) return "—";
  return (
    <span
      className={cn("font-mono", value >= 0 ? "text-profit" : "text-loss")}
    >
      {formatSignedSGD(value)}
    </span>
  );
}

function pctCell(pct: number | null) {
  if (pct == null) return "—";
  return (
    <span
      className={cn("font-mono", pct >= 0 ? "text-profit" : "text-loss")}
    >
      {formatReturnPercent(pct)}
    </span>
  );
}

export function PortfolioHistoryTable({
  history,
  onHistoryChange,
}: PortfolioHistoryTableProps) {
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<PortfolioHistoryFilterId>(() =>
    typeof window !== "undefined"
      ? loadPortfolioHistoryFilter()
      : DEFAULT_PORTFOLIO_HISTORY_FILTER
  );
  const [formRecord, setFormRecord] = useState<
    PortfolioHistoryTableRow | null | undefined
  >(undefined);
  const [removingId, setRemovingId] = useState<string | null>(null);

  const rows = useMemo(
    () => buildHistoryTableRows(history.snapshots),
    [history.snapshots]
  );

  const asOfDate =
    history.latest?.snapshotDate ?? MOCK_REFERENCE_DATE;

  const filteredRows = useMemo(() => {
    const q = search.trim().toLowerCase();

    if (q) {
      return rows.filter((row) => {
        const haystack =
          `${row.snapshotDate} ${row.notes ?? ""}`.toLowerCase();
        return haystack.includes(q);
      });
    }

    return filterRowsByHistoryFilter(rows, filter, asOfDate);
  }, [rows, search, filter, asOfDate]);

  function handleFilterChange(next: PortfolioHistoryFilterId) {
    setFilter(next);
    savePortfolioHistoryFilter(next);
  }

  async function handleDelete(id: string) {
    if (!confirm("Delete this portfolio record permanently?")) return;
    setRemovingId(id);
    const result = await deleteDailyPortfolioRecord(id);
    setRemovingId(null);
    if (result.success) {
      onHistoryChange(result.history);
    }
  }

  const searchInputClass =
    "max-w-xs h-8 rounded-md border border-terminal-border bg-terminal-surface px-3 text-xs text-terminal-text focus:outline-none focus:ring-1 focus:ring-accent/50";

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h3 className="text-xs font-medium uppercase tracking-wider text-terminal-muted">
          Portfolio History
        </h3>
        <Button variant="primary" size="sm" onClick={() => setFormRecord(null)}>
          <Plus className="h-3.5 w-3.5" />
          Add Record
        </Button>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <input
          placeholder="Search date or notes…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className={searchInputClass}
        />
        <div className="flex flex-wrap gap-1">
          {PORTFOLIO_HISTORY_FILTERS.map((f) => (
            <Button
              key={f.id}
              variant={filter === f.id ? "secondary" : "ghost"}
              size="sm"
              className="h-7 px-2 text-[10px]"
              onClick={() => handleFilterChange(f.id)}
            >
              {f.label}
            </Button>
          ))}
        </div>
      </div>

      <div className="overflow-x-auto rounded-lg border border-terminal-border">
        <table className="w-full min-w-[1300px] text-xs">
          <thead>
            <tr className="border-b border-terminal-border bg-terminal-elevated/80 text-left uppercase tracking-wider text-terminal-muted">
              <th className="px-3 py-2.5 font-medium">Date</th>
              <th className="px-3 py-2.5 font-medium text-right">
                My Portfolio Value SGD
              </th>
              <th className="px-3 py-2.5 font-medium text-right">
                Client Current Value
              </th>
              <th className="px-3 py-2.5 font-medium text-right">
                Total Assets Managed
              </th>
              <th className="px-3 py-2.5 font-medium text-right">
                Daily Change
              </th>
              <th className="px-3 py-2.5 font-medium text-right">
                Daily Change %
              </th>
              <th className="px-3 py-2.5 font-medium text-right">
                Weekly Change
              </th>
              <th className="px-3 py-2.5 font-medium text-right">
                Weekly Change %
              </th>
              <th className="px-3 py-2.5 font-medium text-right">
                Monthly Change
              </th>
              <th className="px-3 py-2.5 font-medium text-right">
                Monthly Change %
              </th>
              <th className="px-3 py-2.5 font-medium">Notes</th>
              <th className="px-3 py-2.5 font-medium">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredRows.map((row) => (
              <tr
                key={row.id}
                className="border-b border-terminal-border/50 hover:bg-terminal-elevated/40"
              >
                <td className="px-3 py-2.5 font-mono text-terminal-text">
                  {row.snapshotDate}
                </td>
                <td className="px-3 py-2.5 font-mono text-right font-medium text-terminal-text">
                  {formatSGD(row.portfolioValueSgd)}
                </td>
                <td className="px-3 py-2.5 font-mono text-right text-terminal-muted">
                  {formatSGD(row.clientCurrentValueSgd)}
                </td>
                <td className="px-3 py-2.5 font-mono text-right text-terminal-muted">
                  {formatSGD(row.totalAssetsManagedSgd)}
                </td>
                <td className="px-3 py-2.5 text-right">
                  {valueCell(row.dailyChange)}
                </td>
                <td className="px-3 py-2.5 text-right">
                  {pctCell(row.dailyChangePct)}
                </td>
                <td className="px-3 py-2.5 text-right">
                  {valueCell(row.weeklyChange)}
                </td>
                <td className="px-3 py-2.5 text-right">
                  {pctCell(row.weeklyChangePct)}
                </td>
                <td className="px-3 py-2.5 text-right">
                  {valueCell(row.monthlyChange)}
                </td>
                <td className="px-3 py-2.5 text-right">
                  {pctCell(row.monthlyChangePct)}
                </td>
                <td className="max-w-[180px] truncate px-3 py-2.5 text-terminal-muted">
                  {row.notes ?? "—"}
                </td>
                <td className="px-3 py-2.5">
                  <div className="flex gap-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setFormRecord(row)}
                      aria-label="Edit record"
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-loss"
                      disabled={removingId === row.id}
                      onClick={() => handleDelete(row.id)}
                      aria-label="Delete record"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </td>
              </tr>
            ))}
            {filteredRows.length === 0 && (
              <tr>
                <td
                  colSpan={12}
                  className="px-3 py-10 text-center text-terminal-muted"
                >
                  No portfolio records match your search or filter.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {formRecord !== undefined && (
        <PortfolioHistoryFormModal
          record={formRecord}
          onClose={() => setFormRecord(undefined)}
          onSaved={onHistoryChange}
        />
      )}
    </div>
  );
}
