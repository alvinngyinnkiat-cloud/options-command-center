import type {
  ConcentrationEntry,
  ConcentrationWarning,
} from "@/lib/stocks-etfs/types";
import { formatSGD } from "@/lib/utils";
import { cn } from "@/lib/utils";
import { AlertTriangle, ShieldAlert } from "lucide-react";

interface StockEtfConcentrationPanelProps {
  topHoldings: ConcentrationEntry[];
  warnings: ConcentrationWarning[];
}

export function StockEtfConcentrationPanel({
  topHoldings,
  warnings,
}: StockEtfConcentrationPanelProps) {
  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
      <div className="rounded-lg border border-terminal-border bg-terminal-surface p-4">
        <h3 className="mb-3 text-xs font-medium uppercase tracking-wider text-terminal-muted">
          Top 5 Holdings
        </h3>
        {topHoldings.length === 0 ? (
          <p className="text-xs text-terminal-muted">No holdings recorded yet.</p>
        ) : (
          <ul className="space-y-2">
            {topHoldings.map((h, i) => (
              <li
                key={h.ticker}
                className="flex items-center justify-between gap-2 rounded border border-terminal-border/50 px-2 py-1.5 text-xs"
              >
                <span className="font-mono font-semibold text-terminal-text">
                  {i + 1}. {h.ticker}
                  <span className="ml-1 text-terminal-muted">
                    ({h.assetType})
                  </span>
                </span>
                <span className="font-mono text-terminal-muted">
                  {h.allocationPct.toFixed(1)}% · {formatSGD(h.currentValueSgd)}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="rounded-lg border border-terminal-border bg-terminal-surface p-4">
        <h3 className="mb-3 text-xs font-medium uppercase tracking-wider text-terminal-muted">
          Concentration Warnings
        </h3>
        {warnings.length === 0 ? (
          <p className="text-xs text-profit">No concentration alerts.</p>
        ) : (
          <ul className="space-y-2">
            {warnings.map((w) => {
              const Icon =
                w.level === "critical" ? ShieldAlert : AlertTriangle;
              return (
                <li
                  key={`${w.type}-${w.label}`}
                  className={cn(
                    "flex gap-2 rounded border px-2 py-1.5 text-xs",
                    w.level === "critical"
                      ? "border-loss/40 bg-loss/10 text-loss"
                      : "border-warning/40 bg-warning/10 text-warning"
                  )}
                >
                  <Icon className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                  <span>{w.message}</span>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
