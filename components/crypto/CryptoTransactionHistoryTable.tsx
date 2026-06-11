"use client";

import { useState } from "react";
import { deleteCryptoTransaction } from "@/app/actions/crypto";
import { Button } from "@/components/ui/Button";
import { formatCryptoTransactionType } from "@/lib/crypto/transaction-types";
import type { CryptoTransaction } from "@/types/database";
import { formatSGD, formatSignedSGD } from "@/lib/utils";
import { Trash2 } from "lucide-react";

interface CryptoTransactionHistoryTableProps {
  transactions: CryptoTransaction[];
  onRefresh: () => void;
}

export function CryptoTransactionHistoryTable({
  transactions,
  onRefresh,
}: CryptoTransactionHistoryTableProps) {
  const [removingId, setRemovingId] = useState<string | null>(null);

  async function handleDelete(id: string) {
    if (!confirm("Delete this transaction record?")) return;
    setRemovingId(id);
    await deleteCryptoTransaction(id);
    setRemovingId(null);
    onRefresh();
  }

  if (transactions.length === 0) {
    return (
      <p className="rounded-lg border border-dashed border-terminal-border px-4 py-8 text-center text-sm text-terminal-muted">
        No transactions yet. Record a deposit, buy, or sell to build history.
      </p>
    );
  }

  return (
    <>
      <div className="space-y-3 md:hidden">
        {transactions.map((tx) => (
          <article
            key={tx.id}
            className="rounded-lg border border-terminal-border bg-terminal-surface p-3 space-y-2"
          >
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="text-sm font-semibold text-terminal-text">
                  {formatCryptoTransactionType(tx.transaction_type)}
                </p>
                <p className="text-xs text-terminal-muted">{tx.transaction_date}</p>
              </div>
              <Button
                variant="ghost"
                size="sm"
                className="text-loss shrink-0"
                disabled={removingId === tx.id}
                onClick={() => handleDelete(tx.id)}
                aria-label="Delete transaction"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </div>
            <dl className="grid grid-cols-2 gap-x-3 gap-y-1 text-xs">
              <Field label="Ticker" value={tx.ticker ?? "—"} />
              <Field label="Amount SGD" value={formatSGD(Number(tx.amount_sgd))} />
              <Field label="Fee SGD" value={formatSGD(Number(tx.fee_sgd))} />
              <Field
                label="Net Amount"
                value={formatSignedSGD(Number(tx.net_amount_sgd))}
              />
            </dl>
            {tx.notes && (
              <p className="text-xs text-terminal-muted break-words">{tx.notes}</p>
            )}
          </article>
        ))}
      </div>

      <div className="hidden md:block rounded-lg border border-terminal-border overflow-x-auto">
        <table className="w-full min-w-[640px] text-xs">
          <thead>
            <tr className="border-b border-terminal-border bg-terminal-elevated/80 text-left uppercase tracking-wider text-terminal-muted">
              <th className="px-3 py-2.5 font-medium">Date</th>
              <th className="px-3 py-2.5 font-medium">Type</th>
              <th className="px-3 py-2.5 font-medium">Ticker</th>
              <th className="px-3 py-2.5 font-medium text-right">Amount SGD</th>
              <th className="px-3 py-2.5 font-medium text-right">Fee SGD</th>
              <th className="px-3 py-2.5 font-medium text-right">Net Amount</th>
              <th className="px-3 py-2.5 font-medium">Notes</th>
              <th className="px-3 py-2.5 font-medium">Actions</th>
            </tr>
          </thead>
          <tbody>
            {transactions.map((tx) => (
              <tr
                key={tx.id}
                className="border-b border-terminal-border/50 hover:bg-terminal-elevated/40"
              >
                <td className="px-3 py-2.5 whitespace-nowrap text-terminal-muted">
                  {tx.transaction_date}
                </td>
                <td className="px-3 py-2.5 text-terminal-text">
                  {formatCryptoTransactionType(tx.transaction_type)}
                </td>
                <td className="px-3 py-2.5 font-mono text-accent">
                  {tx.ticker ?? "—"}
                </td>
                <td className="px-3 py-2.5 font-mono text-right tabular-nums">
                  {formatSGD(Number(tx.amount_sgd))}
                </td>
                <td className="px-3 py-2.5 font-mono text-right tabular-nums">
                  {formatSGD(Number(tx.fee_sgd))}
                </td>
                <td className="px-3 py-2.5 font-mono text-right tabular-nums">
                  {formatSignedSGD(Number(tx.net_amount_sgd))}
                </td>
                <td className="px-3 py-2.5 text-terminal-muted max-w-[180px] break-words">
                  {tx.notes ?? "—"}
                </td>
                <td className="px-3 py-2.5">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-loss"
                    disabled={removingId === tx.id}
                    onClick={() => handleDelete(tx.id)}
                    aria-label="Delete transaction"
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
      <dd className="font-mono text-terminal-text tabular-nums break-words">
        {value}
      </dd>
    </div>
  );
}
