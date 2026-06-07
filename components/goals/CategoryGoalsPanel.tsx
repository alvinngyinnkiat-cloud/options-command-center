"use client";

import { formatSGD } from "@/lib/utils";

interface CategoryGoalsPanelProps {
  usEtfValueSgd: number;
  usStockValueSgd: number;
  sgStockValueSgd: number;
  portfolioTargetSgd: number;
}

function Row({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex justify-between text-sm">
      <span className="text-terminal-muted">{label}</span>
      <span className="font-mono font-semibold">{formatSGD(value)}</span>
    </div>
  );
}

export function CategoryGoalsPanel({
  usEtfValueSgd,
  usStockValueSgd,
  sgStockValueSgd,
  portfolioTargetSgd,
}: CategoryGoalsPanelProps) {
  const total = usEtfValueSgd + usStockValueSgd + sgStockValueSgd;
  const pct = (v: number) =>
    portfolioTargetSgd > 0 ? ((v / portfolioTargetSgd) * 100).toFixed(1) : "0.0";

  return (
    <div className="rounded-lg border border-terminal-border bg-terminal-surface p-4 space-y-3">
      <h3 className="text-xs font-medium uppercase tracking-wider text-terminal-muted">
        Category Contribution to Portfolio Goal
      </h3>
      <Row label="US ETF (SGD equiv.)" value={usEtfValueSgd} />
      <p className="text-[10px] text-terminal-muted pl-1">
        {pct(usEtfValueSgd)}% of {formatSGD(portfolioTargetSgd)} target
      </p>
      <Row label="US Stock (SGD equiv.)" value={usStockValueSgd} />
      <p className="text-[10px] text-terminal-muted pl-1">
        {pct(usStockValueSgd)}% of target
      </p>
      <Row label="SG Stock" value={sgStockValueSgd} />
      <p className="text-[10px] text-terminal-muted pl-1">
        {pct(sgStockValueSgd)}% of target
      </p>
      <div className="border-t border-terminal-border pt-2">
        <Row label="Equity Sleeve Total" value={total} />
      </div>
    </div>
  );
}
