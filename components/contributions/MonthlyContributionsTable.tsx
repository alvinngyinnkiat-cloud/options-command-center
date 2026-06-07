"use client";

import { useState } from "react";
import { deleteMonthlyContribution } from "@/app/actions/monthly-contributions";
import { Button } from "@/components/ui/Button";
import { formatContributionMonthLabel } from "@/lib/contributions/calculations";
import type {
  MonthlyContributionRecord,
  MonthlyContributionTrackerData,
} from "@/lib/contributions/types";
import { formatSGD } from "@/lib/utils";
import { Pencil, Trash2 } from "lucide-react";

interface MonthlyContributionsTableProps {
  contributions: MonthlyContributionRecord[];
  onEdit: (contribution: MonthlyContributionRecord) => void;
  onDataChange: (data: MonthlyContributionTrackerData) => void;
}

export function MonthlyContributionsTable({
  contributions,
  onEdit,
  onDataChange,
}: MonthlyContributionsTableProps) {
  const [removingId, setRemovingId] = useState<string | null>(null);

  async function handleDelete(id: string) {
    if (!confirm("Delete this monthly contribution?")) return;
    setRemovingId(id);
    const result = await deleteMonthlyContribution(id);
    setRemovingId(null);
    if (result.success) {
      onDataChange(result.data);
    }
  }

  return (
    <div className="overflow-x-auto rounded-lg border border-terminal-border">
      <table className="w-full min-w-[720px] text-xs">
        <thead>
          <tr className="border-b border-terminal-border bg-terminal-elevated/80 text-left uppercase tracking-wider text-terminal-muted">
            <th className="px-3 py-2.5 font-medium">Month</th>
            <th className="px-3 py-2.5 font-medium text-right">
              Stocks &amp; Options
            </th>
            <th className="px-3 py-2.5 font-medium text-right">Crypto</th>
            <th className="px-3 py-2.5 font-medium text-right">Total</th>
            <th className="px-3 py-2.5 font-medium">Notes</th>
            <th className="px-3 py-2.5 font-medium">Actions</th>
          </tr>
        </thead>
        <tbody>
          {contributions.map((entry) => (
            <tr
              key={entry.id}
              className="border-b border-terminal-border/50 hover:bg-terminal-elevated/40"
            >
              <td className="px-3 py-2.5 text-terminal-text">
                {formatContributionMonthLabel(
                  entry.contributionMonth,
                  entry.contributionYear
                )}
              </td>
              <td className="px-3 py-2.5 font-mono text-right text-terminal-muted">
                {formatSGD(entry.stockOptionsAmountSgd)}
              </td>
              <td className="px-3 py-2.5 font-mono text-right text-terminal-muted">
                {formatSGD(entry.cryptoAmountSgd)}
              </td>
              <td className="px-3 py-2.5 font-mono text-right font-medium text-terminal-text">
                {entry.totalAmountSgd > 0
                  ? formatSGD(entry.totalAmountSgd)
                  : "—"}
              </td>
              <td className="px-3 py-2.5 text-terminal-muted max-w-[200px] truncate">
                {entry.notes ?? "—"}
              </td>
              <td className="px-3 py-2.5">
                <div className="flex gap-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onEdit(entry)}
                    aria-label="Edit month"
                  >
                    <Pencil className="h-3.5 w-3.5" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-loss"
                    disabled={removingId === entry.id}
                    onClick={() => handleDelete(entry.id)}
                    aria-label="Delete month"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </td>
            </tr>
          ))}
          {contributions.length === 0 && (
            <tr>
              <td
                colSpan={6}
                className="px-3 py-10 text-center text-terminal-muted"
              >
                No contributions recorded. Add your first month.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
