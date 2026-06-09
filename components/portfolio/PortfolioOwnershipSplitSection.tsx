"use client";

import { useState, type ReactNode } from "react";
import { saveManualClientPortfolio } from "@/app/actions/portfolio";
import { Button } from "@/components/ui/Button";
import { CreateSnapshotButton } from "@/components/portfolio/CreateSnapshotButton";
import { MetricCardsGrid } from "@/components/ui/MetricCardsGrid";
import type { CapitalPoolsBreakdown } from "@/lib/portfolio/capital-pools";
import { formatOwnershipPercent } from "@/lib/portfolio/ownership-split";
import type { PortfolioMetrics } from "@/lib/portfolio/types";
import { formatRiskCurrency } from "@/lib/risk/format";
import { cn, formatSGD } from "@/lib/utils";

interface PortfolioOwnershipSplitSectionProps {
  metrics: PortfolioMetrics;
  pools: CapitalPoolsBreakdown;
  onSaved: (metrics: PortfolioMetrics, pools: CapitalPoolsBreakdown) => void;
}

function OwnershipStat({
  label,
  value,
  sub,
  highlight,
  children,
}: {
  label: string;
  value: string;
  sub?: string;
  highlight?: boolean;
  children?: ReactNode;
}) {
  return (
    <div
      className={cn(
        "metric-stat-card rounded-lg border px-4 py-3",
        highlight
          ? "border-accent/40 bg-accent/10"
          : "border-terminal-border bg-terminal-elevated/40"
      )}
    >
      <p className="text-[10px] uppercase tracking-wider text-terminal-muted">
        {label}
      </p>
      <p className="metric-stat-value mt-1 font-mono font-semibold text-terminal-text">
        {value}
      </p>
      {sub && (
        <p className="mt-1 text-[10px] text-terminal-muted">{sub}</p>
      )}
      {children}
    </div>
  );
}

function parseNum(value: string): number | null {
  const trimmed = value.trim();
  if (!trimmed) return null;
  const n = parseFloat(trimmed);
  return Number.isFinite(n) ? n : null;
}

export function PortfolioOwnershipSplitSection({
  metrics,
  pools,
  onSaved,
}: PortfolioOwnershipSplitSectionProps) {
  const override = metrics.override;
  const [clientPortfolio, setClientPortfolio] = useState(
    String(
      override?.manualClientPortfolioSgd ?? pools.clientPortfolioSgd ?? ""
    )
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const inputClass =
    "mt-2 w-full h-8 rounded-md border border-terminal-border bg-terminal-surface px-2 font-mono text-sm text-terminal-text focus:outline-none focus:ring-1 focus:ring-accent/50";

  async function handleSave() {
    setSaving(true);
    setError(null);
    const amount = parseNum(clientPortfolio);
    if (amount == null) {
      setError("Enter a valid client portfolio amount (SGD).");
      setSaving(false);
      return;
    }
    if (amount < 0) {
      setError("Client portfolio cannot be negative.");
      setSaving(false);
      return;
    }

    const result = await saveManualClientPortfolio({ clientPortfolioSgd: amount });
    setSaving(false);

    if (!result.success) {
      setError(result.error);
      return;
    }

    setClientPortfolio(String(result.capitalPools.clientPortfolioSgd));
    onSaved(result.metrics, result.capitalPools);
  }

  return (
    <section className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-xs font-medium uppercase tracking-wider text-terminal-muted">
            Portfolio Ownership Split
          </h2>
          <p className="mt-1 text-[11px] text-terminal-muted">
            Total portfolio is US/SG stocks, options, crypto value, and trading
            cash (SGD). Client portfolio is your manual ownership split; my
            portfolio and percentages update automatically.
          </p>
        </div>
        <CreateSnapshotButton />
      </div>

      <MetricCardsGrid>
        <OwnershipStat
          label="Total Portfolio"
          value={formatSGD(pools.totalPortfolioSgd)}
          sub="US/SG + options + Crypto Value + Trading Cash SGD"
          highlight
        />
        <OwnershipStat
          label="Client Portfolio"
          value={formatSGD(pools.clientPortfolioSgd)}
          sub="Manual SGD input — editable"
        >
          <input
            id="clientPortfolioSgd"
            type="number"
            min="0"
            step="0.01"
            className={inputClass}
            value={clientPortfolio}
            onChange={(e) => setClientPortfolio(e.target.value)}
            aria-label="Client portfolio SGD"
          />
          {error && (
            <p className="mt-1 text-[10px] text-loss" role="alert">
              {error}
            </p>
          )}
          <p className="mt-2 text-[10px] text-terminal-muted">
            Client Current Value (USD):{" "}
            <span className="font-mono text-terminal-text">
              {formatRiskCurrency(pools.clientCurrentValue)}
            </span>
          </p>
          <p className="text-[10px] text-terminal-muted">
            Reference only — from Client Profit Sharing Tracker
          </p>
          <Button
            variant="primary"
            size="sm"
            className="mt-2 h-7"
            disabled={saving}
            onClick={handleSave}
          >
            {saving ? "Saving…" : "Save"}
          </Button>
        </OwnershipStat>
        <OwnershipStat
          label="My Portfolio"
          value={formatSGD(pools.myPortfolioValue)}
          sub="Total Portfolio − Client Portfolio"
        />
        <OwnershipStat
          label="Client Ownership %"
          value={formatOwnershipPercent(pools.clientOwnershipPct)}
          sub="Client Portfolio ÷ Total Portfolio × 100"
        />
        <OwnershipStat
          label="My Ownership %"
          value={formatOwnershipPercent(pools.myOwnershipPct)}
          sub="My Portfolio ÷ Total Portfolio × 100"
        />
      </MetricCardsGrid>
    </section>
  );
}
