"use client";

import { formatSGD } from "@/lib/utils";
import type { PortfolioCategoryBreakdown } from "@/lib/portfolio/portfolio-category-metrics";

interface PortfolioCategoryBreakdownCardProps {
  breakdown: PortfolioCategoryBreakdown;
}

function Row({ label, value, pct }: { label: string; value: number; pct?: number }) {
  return (
    <div className="flex items-center justify-between gap-2 text-sm">
      <span className="text-terminal-muted">{label}</span>
      <span className="font-mono font-semibold">
        {formatSGD(value)}
        {pct != null && (
          <span className="ml-2 text-[10px] text-terminal-muted">
            {pct.toFixed(1)}%
          </span>
        )}
      </span>
    </div>
  );
}

export function PortfolioCategoryBreakdownCard({
  breakdown,
}: PortfolioCategoryBreakdownCardProps) {
  return (
    <div className="rounded-lg border border-terminal-border bg-terminal-surface p-4 space-y-4">
      <h2 className="text-xs font-medium uppercase tracking-wider text-terminal-muted">
        Portfolio Breakdown (SGD)
      </h2>
      <div className="space-y-2">
        <Row label="US ETF" value={breakdown.usEtfValueSgd} pct={breakdown.usEtfPct} />
        <Row label="US Stock" value={breakdown.usStockValueSgd} pct={breakdown.usStockPct} />
        <Row label="SG Stock" value={breakdown.sgStockValueSgd} pct={breakdown.sgStockPct} />
        <Row label="Crypto" value={breakdown.cryptoValueSgd} pct={breakdown.cryptoPct} />
        <Row label="Cash" value={breakdown.cashValueSgd} pct={breakdown.cashPct} />
        <div className="border-t border-terminal-border pt-2">
          <Row label="Total Portfolio" value={breakdown.totalPortfolioValueSgd} />
        </div>
      </div>
      <div className="border-t border-terminal-border pt-3 space-y-2">
        <p className="text-[10px] uppercase tracking-wider text-terminal-muted">
          Total Premium Collected (USD)
        </p>
        <Row label="Combined" value={breakdown.totalPremiumCollected} />
        <Row label="US ETF Premium" value={breakdown.usEtfPremium} />
        <Row label="US Stock Premium" value={breakdown.usStockPremium} />
        <Row label="LEAPS-linked Premium" value={breakdown.leapsPremium} />
        <p className="text-[10px] text-terminal-muted">
          Premium income reduces cost basis — shown separately from unrealized gains.
        </p>
      </div>
    </div>
  );
}
