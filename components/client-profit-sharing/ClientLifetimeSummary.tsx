import { formatRiskCurrency } from "@/lib/risk/format";
import type { ClientProfitSharingSummary } from "@/lib/client-profit-sharing/types";

interface ClientLifetimeSummaryProps {
  summary: ClientProfitSharingSummary;
}

export function ClientLifetimeSummary({ summary }: ClientLifetimeSummaryProps) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      <div className="rounded-lg border border-terminal-border bg-terminal-elevated/20 px-3 py-2">
        <p className="text-[10px] uppercase text-terminal-muted">Lifetime Profit</p>
        <p className="font-mono text-sm text-terminal-text">
          {formatRiskCurrency(summary.lifetimeTradeProfit)}
        </p>
      </div>
      <div className="rounded-lg border border-terminal-border bg-terminal-elevated/20 px-3 py-2">
        <p className="text-[10px] uppercase text-terminal-muted">Lifetime Client Share</p>
        <p className="font-mono text-sm text-profit">
          {formatRiskCurrency(summary.lifetimeClientShare)}
        </p>
      </div>
      <div className="rounded-lg border border-terminal-border bg-terminal-elevated/20 px-3 py-2">
        <p className="text-[10px] uppercase text-terminal-muted">Lifetime My Share</p>
        <p className="font-mono text-sm text-accent">
          {formatRiskCurrency(summary.lifetimeMyShare)}
        </p>
      </div>
      <div className="rounded-lg border border-terminal-border bg-terminal-elevated/20 px-3 py-2">
        <p className="text-[10px] uppercase text-terminal-muted">Paid To Client</p>
        <p className="font-mono text-sm text-terminal-muted">
          {formatRiskCurrency(summary.totalPaidToClient)}
        </p>
      </div>
    </div>
  );
}
