"use client";

import { useState } from "react";
import { deleteStockEtfLedgerEntry } from "@/app/actions/stock-etf-cash";
import { Button } from "@/components/ui/Button";
import { formatStockEtfLedgerType } from "@/lib/stocks-etfs/ledger-types";
import { categoryLabel } from "@/lib/stocks-etfs/market-category";
import type { StockEtfLedgerEntry } from "@/types/database";
import { formatSGD, formatSignedSGD } from "@/lib/utils";
import { formatNativeValue } from "@/lib/portfolio/format-holdings";
import { Trash2 } from "lucide-react";

interface StockEtfTransactionHistoryTableProps {
  ledger: StockEtfLedgerEntry[];
  onRefresh: () => void;
}

function formatAmount(entry: StockEtfLedgerEntry): string {
  if (entry.currency === "SGD") {
    return formatSignedSGD(Number(entry.net_amount_native));
  }
  return formatNativeValue(Number(entry.net_amount_native), "USD");
}

export function StockEtfTransactionHistoryTable({
  ledger,
  onRefresh,
}: StockEtfTransactionHistoryTableProps) {
  const [removingId, setRemovingId] = useState<string | null>(null);

  async function handleDelete(id: string) {
    if (!confirm("Delete this ledger entry?")) return;
    setRemovingId(id);
    await deleteStockEtfLedgerEntry(id);
    setRemovingId(null);
    onRefresh();
  }

  if (ledger.length === 0) {
    return (
      <p className="rounded-lg border border-dashed border-terminal-border px-4 py-8 text-center text-sm text-terminal-muted">
        No transactions yet. Record a buy, sell, or contribution to build history.
      </p>
    );
  }

  return (
    <>
      <div className="space-y-3 md:hidden">
        {ledger.map((entry) => (
          <article
            key={entry.id}
            className="rounded-lg border border-terminal-border bg-terminal-surface p-3 space-y-2"
          >
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="text-sm font-semibold text-terminal-text">
                  {formatStockEtfLedgerType(entry.transaction_type)}
                </p>
                <p className="text-xs text-terminal-muted">
                  {entry.transaction_date} · {categoryLabel(entry.market_category)}
                </p>
              </div>
              <Button
                variant="ghost"
                size="sm"
                className="text-loss shrink-0"
                disabled={removingId === entry.id}
                onClick={() => handleDelete(entry.id)}
              >
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </div>
            <dl className="grid grid-cols-2 gap-x-3 gap-y-1 text-xs">
              <Field label="Ticker" value={entry.ticker ?? "—"} />
              <Field
                label="Shares"
                value={entry.shares != null ? String(entry.shares) : "—"}
              />
              <Field
                label="Amount"
                value={
                  entry.currency === "SGD"
                    ? formatSGD(Number(entry.amount_native))
                    : formatNativeValue(Number(entry.amount_native), "USD")
                }
              />
              <Field
                label="Fee"
                value={
                  entry.currency === "SGD"
                    ? formatSGD(Number(entry.fee_native))
                    : formatNativeValue(Number(entry.fee_native), "USD")
                }
              />
              <Field label="Net" value={formatAmount(entry)} />
              <Field label="Currency" value={entry.currency} />
            </dl>
            {entry.notes && (
              <p className="text-xs text-terminal-muted break-words">{entry.notes}</p>
            )}
          </article>
        ))}
      </div>

      <div className="hidden md:block rounded-lg border border-terminal-border overflow-x-auto">
        <table className="w-full min-w-[760px] text-xs">
          <thead>
            <tr className="border-b border-terminal-border bg-terminal-elevated/80 text-left uppercase tracking-wider text-terminal-muted">
              {[
                "Date",
                "Type",
                "Market",
                "Ticker",
                "Shares",
                "Amount",
                "Fee",
                "Net",
                "Currency",
                "Notes",
                "Actions",
              ].map((h) => (
                <th key={h} className="px-2 py-2.5 font-medium">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {ledger.map((entry) => (
              <tr
                key={entry.id}
                className="border-b border-terminal-border/50 hover:bg-terminal-elevated/40"
              >
                <td className="px-2 py-2.5 whitespace-nowrap">{entry.transaction_date}</td>
                <td className="px-2 py-2.5">{formatStockEtfLedgerType(entry.transaction_type)}</td>
                <td className="px-2 py-2.5">{categoryLabel(entry.market_category)}</td>
                <td className="px-2 py-2.5 font-mono text-accent">{entry.ticker ?? "—"}</td>
                <td className="px-2 py-2.5 font-mono tabular-nums">
                  {entry.shares ?? "—"}
                </td>
                <td className="px-2 py-2.5 font-mono tabular-nums">
                  {entry.currency === "SGD"
                    ? formatSGD(Number(entry.amount_native))
                    : formatNativeValue(Number(entry.amount_native), "USD")}
                </td>
                <td className="px-2 py-2.5 font-mono tabular-nums">
                  {entry.currency === "SGD"
                    ? formatSGD(Number(entry.fee_native))
                    : formatNativeValue(Number(entry.fee_native), "USD")}
                </td>
                <td className="px-2 py-2.5 font-mono tabular-nums">{formatAmount(entry)}</td>
                <td className="px-2 py-2.5">{entry.currency}</td>
                <td className="px-2 py-2.5 max-w-[160px] break-words">{entry.notes ?? "—"}</td>
                <td className="px-2 py-2.5">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-loss"
                    disabled={removingId === entry.id}
                    onClick={() => handleDelete(entry.id)}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-terminal-muted">{label}</dt>
      <dd className="font-mono text-terminal-text tabular-nums break-words">{value}</dd>
    </div>
  );
}
