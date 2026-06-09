import { formatCurrency } from "@/lib/trades/format";
import { formatPnL, getPnLColor } from "@/lib/format/pnl";
import { cn } from "@/lib/utils";
import type { ExpectedReturnDashboard } from "@/lib/trading-workflow/types";

interface ExpectedReturnPanelProps {
  data: ExpectedReturnDashboard;
}

export function ExpectedReturnPanel({ data }: ExpectedReturnPanelProps) {
  const unrealizedProps = {
    value: formatPnL(data.currentUnrealizedPnl, { currency: "USD" }),
    className: getPnLColor(data.currentUnrealizedPnl),
  };

  return (
    <div className="space-y-4">
      <p className="text-[10px] text-terminal-muted italic">{data.disclaimer}</p>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: "Open Trades", value: String(data.openTradesCount) },
          {
            label: "Premium Collected",
            value: formatCurrency(data.totalPremiumCollected),
          },
          {
            label: "75% Profit Target",
            value: formatCurrency(data.profitTarget75Pct),
          },
          {
            label: "Unrealized P/L",
            value: unrealizedProps.value,
            valueClassName: unrealizedProps.className,
          },
        ].map((m) => (
          <div
            key={m.label}
            className="rounded-lg border border-terminal-border bg-terminal-elevated px-3 py-2"
          >
            <p className="text-[10px] text-terminal-muted">{m.label}</p>
            <p
              className={cn(
                "text-sm font-mono font-semibold",
                m.valueClassName ?? "text-terminal-text"
              )}
            >
              {m.value}
            </p>
          </div>
        ))}
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {data.estimates.map((est) => (
          <div
            key={est.label}
            className="rounded-lg border border-terminal-border bg-terminal-elevated p-3"
          >
            <p className="text-xs font-semibold text-terminal-text">
              {est.label} Estimate
            </p>
            <p className="text-[11px] text-terminal-muted mt-1">
              Monthly: {formatCurrency(est.monthlyProfit)}
            </p>
            <p className="text-[11px] text-terminal-muted">
              Annual: {formatCurrency(est.annualizedIncome)}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
