"use client";

import { useState } from "react";
import { saveManualTradingCash } from "@/app/actions/portfolio";
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
import { formatNativeValue } from "@/lib/portfolio/format-holdings";
import { formatSGD } from "@/lib/utils";

interface ManualTradingCashCardProps {
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

export function ManualTradingCashCard({
  metrics,
  pools,
  onSaved,
}: ManualTradingCashCardProps) {
  const override = metrics.override;
  const [tradingCashUsd, setTradingCashUsd] = useState(
    String(
      override?.manualTradingCashUsd ??
        pools.cash.brokerUsdCashNative ??
        ""
    )
  );
  const [tradingCashSgd, setTradingCashSgd] = useState(
    String(
      override?.manualTradingCashSgd ??
        pools.cash.tradingCashSgd ??
        ""
    )
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const inputClass =
    "w-full h-9 rounded-md border border-terminal-border bg-terminal-surface px-3 font-mono text-sm text-terminal-text focus:outline-none focus:ring-1 focus:ring-accent/50";

  async function handleSave() {
    setSaving(true);
    setError(null);
    const usd = parseNum(tradingCashUsd);
    const sgd = parseNum(tradingCashSgd);
    if (usd == null || sgd == null) {
      setError("Enter valid amounts for both USD and SGD trading cash.");
      setSaving(false);
      return;
    }

    const result = await saveManualTradingCash({
      tradingCashUsd: usd,
      tradingCashSgd: sgd,
    });
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
          <CardTitle className="text-sm">Manual Trading Cash</CardTitle>
          <Badge variant="info">Manual Input</Badge>
        </div>
        <CardDescription>
          Enter broker-reported cash separately. SGD cash drives dashboard and
          risk calculations. USD cash is reference only — never auto-converted or
          added to SGD.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label
              htmlFor="tradingCashUsd"
              className="mb-1 block text-[10px] uppercase tracking-wider text-terminal-muted"
            >
              Trading Cash USD
            </label>
            <input
              id="tradingCashUsd"
              type="number"
              min="0"
              step="0.01"
              className={inputClass}
              value={tradingCashUsd}
              onChange={(e) => setTradingCashUsd(e.target.value)}
            />
            <p className="mt-1 text-[10px] text-terminal-muted">
              US stocks, options, buying power reference
            </p>
          </div>
          <div>
            <label
              htmlFor="tradingCashSgd"
              className="mb-1 block text-[10px] uppercase tracking-wider text-terminal-muted"
            >
              Trading Cash SGD
            </label>
            <input
              id="tradingCashSgd"
              type="number"
              min="0"
              step="0.01"
              className={inputClass}
              value={tradingCashSgd}
              onChange={(e) => setTradingCashSgd(e.target.value)}
            />
            <p className="mt-1 text-[10px] text-terminal-muted">
              Used for Trading Capital, risk capacity, dashboard summary
            </p>
          </div>
        </div>

        <div className="rounded-md border border-terminal-border/60 bg-terminal-elevated/20 px-3 py-2 text-xs text-terminal-muted">
          <p>
            Summary uses{" "}
            <span className="font-mono text-terminal-text">
              {formatSGD(pools.cash.tradingCashSgd)}
            </span>{" "}
            (SGD only). USD reference:{" "}
            <span className="font-mono text-terminal-text">
              {formatNativeValue(pools.cash.brokerUsdCashNative, "USD")}
            </span>
          </p>
        </div>

        {error && (
          <p className="text-xs text-loss" role="alert">
            {error}
          </p>
        )}

        <Button variant="primary" size="sm" disabled={saving} onClick={handleSave}>
          {saving ? "Saving…" : "Save Trading Cash"}
        </Button>
      </CardContent>
    </Card>
  );
}
