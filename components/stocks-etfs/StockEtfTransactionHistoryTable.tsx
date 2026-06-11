"use client";

import type { StockEtfTransactionWithTicker } from "@/lib/supabase/queries/stock-etf-positions";
import { formatNativeValue } from "@/lib/portfolio/format-holdings";

interface StockEtfTransactionHistoryTableProps {
  transactions: StockEtfTransactionWithTicker[];
}

function formatType(type: string): string {
  switch (type) {
    case "buy":
      return "Buy";
    case "sell":
      return "Sell";
    case "opening_balance":
      return "Opening Balance";
    case "dividend":
      return "Dividend";
    default:
      return type;
  }
}

export function StockEtfTransactionHistoryTable({
  transactions,
}: StockEtfTransactionHistoryTableProps) {
  if (transactions.length === 0) {
    return (
      <p className="rounded-lg border border-dashed border-terminal-border px-4 py-8 text-center text-sm text-terminal-muted">
        No transactions yet. Use Buy or Sell above to record historical or new
        trades.
      </p>
    );
  }

  return (
    <>
      <div className="space-y-3 md:hidden">
        {transactions.map((tx) => (
          <article
            key={tx.id}
            className="rounded-lg border border-terminal-border bg-terminal-surface p-3 space-y-1 text-xs"
          >
            <div className="flex items-center justify-between gap-2">
              <span className="font-mono font-semibold text-accent">{tx.ticker}</span>
              <span className="uppercase text-terminal-muted">{formatType(tx.transactionType)}</span>
            </div>
            <p className="text-terminal-muted">{tx.transactionDate}</p>
            <p>
              {tx.shares > 0 ? `${tx.shares} @ ` : ""}
              {formatNativeValue(tx.pricePerShare, tx.currency)}
              {tx.fees > 0 ? ` · Fee ${formatNativeValue(tx.fees, tx.currency)}` : ""}
            </p>
            <p className="font-mono">
              Total {formatNativeValue(tx.totalAmount, tx.currency)}
            </p>
            {tx.notes && <p className="text-terminal-muted">{tx.notes}</p>}
          </article>
        ))}
      </div>

      <div className="hidden overflow-x-auto rounded-lg border border-terminal-border md:block">
        <table className="w-full min-w-[880px] text-xs">
          <thead>
            <tr className="border-b border-terminal-border bg-terminal-elevated/80 text-left uppercase tracking-wider text-terminal-muted">
              <th className="px-3 py-2.5 font-medium">Date</th>
              <th className="px-3 py-2.5 font-medium">Type</th>
              <th className="px-3 py-2.5 font-medium">Ticker</th>
              <th className="px-3 py-2.5 font-medium text-right">Shares</th>
              <th className="px-3 py-2.5 font-medium text-right">Price</th>
              <th className="px-3 py-2.5 font-medium text-right">Fees</th>
              <th className="px-3 py-2.5 font-medium text-right">Total</th>
              <th className="px-3 py-2.5 font-medium">Notes</th>
            </tr>
          </thead>
          <tbody>
            {transactions.map((tx) => (
              <tr
                key={tx.id}
                className="border-b border-terminal-border/60 last:border-0"
              >
                <td className="px-3 py-2.5 text-terminal-muted">{tx.transactionDate}</td>
                <td className="px-3 py-2.5">{formatType(tx.transactionType)}</td>
                <td className="px-3 py-2.5 font-mono text-accent">{tx.ticker}</td>
                <td className="px-3 py-2.5 text-right font-mono">
                  {tx.shares > 0 ? tx.shares.toLocaleString() : "—"}
                </td>
                <td className="px-3 py-2.5 text-right font-mono">
                  {formatNativeValue(tx.pricePerShare, tx.currency)}
                </td>
                <td className="px-3 py-2.5 text-right font-mono">
                  {formatNativeValue(tx.fees, tx.currency)}
                </td>
                <td className="px-3 py-2.5 text-right font-mono">
                  {formatNativeValue(tx.totalAmount, tx.currency)}
                </td>
                <td className="px-3 py-2.5 text-terminal-muted max-w-[200px] truncate">
                  {tx.notes ?? "—"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
