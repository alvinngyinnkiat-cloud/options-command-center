import type { SectorAllocationEntry } from "@/lib/stocks-etfs/types";
import { formatSGD } from "@/lib/utils";
import { cn } from "@/lib/utils";

const SECTOR_COLORS: Record<string, string> = {
  Technology: "text-accent",
  Financials: "text-profit",
  Healthcare: "text-warning",
  Energy: "text-loss",
  Consumer: "text-terminal-text",
  Others: "text-terminal-muted",
};

interface StockEtfSectorAllocationProps {
  sectors: SectorAllocationEntry[];
}

export function StockEtfSectorAllocation({
  sectors,
}: StockEtfSectorAllocationProps) {
  if (sectors.length === 0) {
    return (
      <p className="text-xs text-terminal-muted rounded-lg border border-terminal-border px-4 py-3">
        No sector data.
      </p>
    );
  }

  return (
    <div className="space-y-2">
      {sectors.map((s) => (
        <div
          key={s.sector}
          className="flex items-center justify-between gap-3 rounded-lg border border-terminal-border bg-terminal-elevated/20 px-3 py-2"
        >
          <span
            className={cn(
              "text-xs font-medium",
              SECTOR_COLORS[s.sector] ?? "text-terminal-muted"
            )}
          >
            {s.sector}
          </span>
          <div className="text-right text-xs">
            <p className="font-mono text-terminal-text">
              {formatSGD(s.valueSgd)}
            </p>
            <p className="text-terminal-muted">{s.allocationPct.toFixed(1)}%</p>
          </div>
        </div>
      ))}
    </div>
  );
}
