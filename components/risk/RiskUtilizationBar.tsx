import {
  RISK_UTILIZATION_CAUTION_MAX,
  RISK_UTILIZATION_SAFE_MAX,
} from "@/lib/risk/constants";
import { formatRiskPct, riskZoneClass, riskZoneLabel } from "@/lib/risk/format";
import type { RiskZone } from "@/lib/risk/constants";
import { cn } from "@/lib/utils";

interface RiskUtilizationBarProps {
  utilizationPct: number;
  zone: RiskZone;
}

export function RiskUtilizationBar({
  utilizationPct,
  zone,
}: RiskUtilizationBarProps) {
  const width = Math.min(100, Math.max(0, utilizationPct));

  return (
    <div className="rounded-lg border border-terminal-border bg-terminal-surface p-4">
      <div className="mb-2 flex items-center justify-between text-xs">
        <span className="uppercase tracking-wider text-terminal-muted">
          Risk Utilization
        </span>
        <span className={cn("font-mono font-semibold", riskZoneClass(zone))}>
          {formatRiskPct(utilizationPct)} · {riskZoneLabel(zone)}
        </span>
      </div>
      <div className="relative h-3 overflow-hidden rounded-full bg-terminal-elevated">
        <div
          className={cn(
            "h-full transition-all",
            zone === "safe" && "bg-profit",
            zone === "caution" && "bg-warning",
            zone === "danger" && "bg-loss"
          )}
          style={{ width: `${width}%` }}
        />
        <div
          className="absolute top-0 h-full w-px bg-terminal-muted/50"
          style={{ left: `${RISK_UTILIZATION_SAFE_MAX}%` }}
        />
        <div
          className="absolute top-0 h-full w-px bg-terminal-muted/50"
          style={{ left: `${RISK_UTILIZATION_CAUTION_MAX}%` }}
        />
      </div>
      <div className="mt-2 flex justify-between text-[10px] text-terminal-muted">
        <span>0%</span>
        <span>Safe 0–{RISK_UTILIZATION_SAFE_MAX}%</span>
        <span>Caution {RISK_UTILIZATION_SAFE_MAX}–{RISK_UTILIZATION_CAUTION_MAX}%</span>
        <span>Danger &gt;{RISK_UTILIZATION_CAUTION_MAX}%</span>
      </div>
    </div>
  );
}
