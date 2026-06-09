"use client";

import { useState } from "react";
import { saveManualCryptoCash } from "@/app/actions/portfolio";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/Card";
import type { CapitalPoolsBreakdown } from "@/lib/portfolio/capital-pools";
import type { PortfolioMetrics } from "@/lib/portfolio/types";
import { formatSGD } from "@/lib/utils";

interface ManualCryptoCashCardProps {
  metrics: PortfolioMetrics;
  pools: CapitalPoolsBreakdown;
  onSaved: (metrics: PortfolioMetrics, pools: CapitalPoolsBreakdown) => void;
}

function parseNum(value: string): number | null {
  const trimmed = value.trim();
  if (!trimmed) return null;
  const n = parseFloat(trimmed);
  return Number.isFinite(n) ? n : null;
}

export function ManualCryptoCashCard({
  metrics,
  pools,
  onSaved,
}: ManualCryptoCashCardProps) {
  const override = metrics.override;
  const [cryptoCashSgd, setCryptoCashSgd] = useState(
    String(
      override?.manualCryptoCashSgd ?? pools.cryptoCashSgd ?? ""
    )
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const inputClass =
    "w-full h-9 rounded-md border border-terminal-border bg-terminal-surface px-3 font-mono text-sm text-terminal-text focus:outline-none focus:ring-1 focus:ring-accent/50";

  async function handleSave() {
    setSaving(true);
    setError(null);
    const sgd = parseNum(cryptoCashSgd);
    if (sgd == null) {
      setError("Enter a valid Crypto Cash amount (SGD).");
      setSaving(false);
      return;
    }

    const result = await saveManualCryptoCash({ cryptoCashSgd: sgd });
    setSaving(false);

    if (!result.success) {
      setError(result.error);
      return;
    }

    onSaved(result.metrics, result.capitalPools);
  }

  return (
    <Card variant="bordered">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between gap-2">
          <CardTitle className="text-sm">Available Exchange Cash</CardTitle>
          <Badge variant="outline">Crypto Breakdown</Badge>
        </div>
        <CardDescription>
          Actual uninvested exchange cash available for deployment. Not USDT,
          USDC, or any stablecoin holdings.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <label
            htmlFor="cryptoCashSgd"
            className="mb-1 block text-[10px] uppercase tracking-wider text-terminal-muted"
          >
            Available Exchange Cash (SGD)
          </label>
          <input
            id="cryptoCashSgd"
            type="number"
            min="0"
            step="0.01"
            className={inputClass}
            value={cryptoCashSgd}
            onChange={(e) => setCryptoCashSgd(e.target.value)}
          />
          <p className="mt-1 text-[10px] text-terminal-muted">
            Actual uninvested exchange cash — not USDT, USDC, or stablecoins
          </p>
        </div>

        <div className="rounded-md border border-terminal-border/60 bg-terminal-elevated/20 px-3 py-2 text-xs text-terminal-muted">
          <p>
            Crypto Portfolio Value uses{" "}
            <span className="font-mono text-terminal-text">
              {formatSGD(pools.cryptoHoldingsSgd)}
            </span>{" "}
            coin holdings +{" "}
            <span className="font-mono text-terminal-text">
              {formatSGD(pools.cryptoCashSgd)}
            </span>{" "}
            crypto cash ={" "}
            <span className="font-mono text-terminal-text">
              {formatSGD(pools.cryptoPortfolioValueSgd)}
            </span>
          </p>
        </div>

        {error && (
          <p className="text-xs text-loss" role="alert">
            {error}
          </p>
        )}

        <Button variant="primary" size="sm" disabled={saving} onClick={handleSave}>
          {saving ? "Saving…" : "Save Crypto Cash"}
        </Button>
      </CardContent>
    </Card>
  );
}
