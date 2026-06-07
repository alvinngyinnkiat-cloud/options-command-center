"use client";

import { useState } from "react";
import { savePortfolioOverride } from "@/app/actions/portfolio";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/Card";
import { formatNativeValue } from "@/lib/portfolio/format-holdings";
import type { PortfolioMetrics, PortfolioOverrideInput } from "@/lib/portfolio/types";
import { formatSGD, formatSignedSGD } from "@/lib/utils";
import { cn } from "@/lib/utils";
import { Scale } from "lucide-react";

interface ManualPortfolioOverrideCardProps {
  metrics: PortfolioMetrics;
  onMetricsChange: (metrics: PortfolioMetrics) => void;
}

function parseNum(value: string): number | null {
  const trimmed = value.trim();
  if (!trimmed) return null;
  const n = parseFloat(trimmed);
  return isNaN(n) ? null : n;
}

export function ManualPortfolioOverrideCard({
  metrics,
  onMetricsChange,
}: ManualPortfolioOverrideCardProps) {
  const override = metrics.override;
  const [useManual, setUseManual] = useState(
    override?.useManualOverride ?? false
  );
  const [usUsd, setUsUsd] = useState(
    String(override?.manualUsStocksOptionsValueUsd ?? "")
  );
  const [usSgd, setUsSgd] = useState(
    String(override?.manualUsStocksOptionsSgdEquivalent ?? "")
  );
  const [crypto, setCrypto] = useState(
    String(override?.manualCryptoValueSgd ?? "")
  );
  const [sgSgd, setSgSgd] = useState(
    String(override?.manualSgStocksCashValueSgd ?? "")
  );
  const [reason, setReason] = useState(override?.overrideReason ?? "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { comparison, calculated } = metrics;
  const diff = comparison.differenceSgd;

  async function handleSave() {
    setSaving(true);
    setError(null);

    const input: PortfolioOverrideInput = {
      useManualOverride: useManual,
      manualUsStocksOptionsValueUsd: parseNum(usUsd),
      manualUsStocksOptionsSgdEquivalent: parseNum(usSgd),
      manualCryptoValueSgd: parseNum(crypto),
      manualSgStocksCashValueSgd: parseNum(sgSgd),
      manualUsdSgdRate: override?.manualUsdSgdRate ?? 1.35,
      manualTotalPortfolioValueSgd: null,
      overrideReason: reason.trim() || null,
      overrideUpdatedAt: new Date().toISOString(),
    };

    const result = await savePortfolioOverride(input);
    setSaving(false);

    if (!result.success) {
      setError(result.error);
      return;
    }

    onMetricsChange(result.metrics);
  }

  return (
    <Card variant="bordered">
      <CardHeader>
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-start gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-md bg-accent/15 border border-accent/20">
              <Scale className="h-4 w-4 text-accent" />
            </div>
            <div>
              <CardTitle>Daily Portfolio Reconciliation</CardTitle>
              <CardDescription>
                Enter broker-reported values — US stays in USD, overall portfolio
                in SGD. No FX conversion.
              </CardDescription>
            </div>
          </div>
          <Badge variant={comparison.useManualOverride ? "success" : "outline"}>
            {comparison.useManualOverride ? "Manual ON" : "Calculated"}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <ComparisonBox
            label="Overall Portfolio (manual)"
            value={
              comparison.overallPortfolioValueSgd != null
                ? formatSGD(comparison.overallPortfolioValueSgd)
                : "—"
            }
            highlight={comparison.useManualOverride}
          />
          <ComparisonBox
            label="App Calculated Value"
            value={formatSGD(comparison.calculatedOverallPortfolioValueSgd)}
          />
          <ComparisonBox
            label="Difference"
            value={diff != null ? formatSignedSGD(diff) : "—"}
            valueClassName={
              diff != null
                ? diff >= 0
                  ? "text-profit"
                  : "text-loss"
                : undefined
            }
          />
        </div>

        <SectionDisplay title="US">
          <ComparisonBox
            label="US Stocks & Options Value (USD)"
            value={
              comparison.manualUsStocksOptionsValueUsd != null
                ? formatNativeValue(
                    comparison.manualUsStocksOptionsValueUsd,
                    "USD"
                  )
                : "—"
            }
            sub={`App: ${formatNativeValue(
              comparison.calculatedUsStocksOptionsValueUsd,
              "USD"
            )}`}
          />
          <ComparisonBox
            label="US Stocks & Options SGD Equivalent"
            value={
              comparison.manualUsStocksOptionsSgdEquivalent != null
                ? formatSGD(comparison.manualUsStocksOptionsSgdEquivalent)
                : "—"
            }
            sub={`App: ${formatSGD(
              comparison.calculatedUsStocksOptionsSgdEquivalent
            )}`}
          />
        </SectionDisplay>

        <SectionDisplay title="Crypto">
          <ComparisonBox
            label="Crypto Value (SGD)"
            value={
              comparison.manualCryptoValueSgd != null
                ? formatSGD(comparison.manualCryptoValueSgd)
                : "—"
            }
            sub={`App: ${formatSGD(comparison.calculatedCryptoValueSgd)}`}
          />
        </SectionDisplay>

        <SectionDisplay title="Singapore">
          <ComparisonBox
            label="SG Stocks / SG Cash Value (SGD)"
            value={
              comparison.manualSgStocksCashValueSgd != null
                ? formatSGD(comparison.manualSgStocksCashValueSgd)
                : "—"
            }
            sub={`App: ${formatSGD(
              comparison.calculatedSgStocksCashValueSgd
            )}`}
          />
        </SectionDisplay>

        <SectionDisplay title="Total">
          <ComparisonBox
            label="Overall Portfolio Value (SGD)"
            value={formatSGD(metrics.portfolioValue)}
            highlight={comparison.useManualOverride}
            sub={
              comparison.useManualOverride
                ? "US SGD equiv + Crypto + SG"
                : "From holdings"
            }
          />
        </SectionDisplay>

        <div className="flex items-center justify-between rounded-md border border-terminal-border bg-terminal-elevated px-4 py-3">
          <div>
            <p className="text-sm font-medium text-terminal-text">
              Use Manual Reconciliation
            </p>
            <p className="text-xs text-terminal-muted">
              Broker-reported values become the main portfolio total (SGD)
            </p>
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={useManual}
            onClick={() => setUseManual((v) => !v)}
            className={cn(
              "relative h-6 w-11 rounded-full transition-colors",
              useManual ? "bg-accent" : "bg-terminal-border"
            )}
          >
            <span
              className={cn(
                "absolute top-0.5 left-0.5 h-5 w-5 rounded-full bg-white transition-transform",
                useManual && "translate-x-5"
              )}
            />
          </button>
        </div>

        <SectionDisplay title="Manual Inputs">
          <div className="col-span-full grid grid-cols-1 gap-3 sm:grid-cols-2">
            <InputField
              label="US Stocks & Options Value (USD)"
              description="Actual broker value for US stocks, ETFs, options, and USD cash."
              value={usUsd}
              onChange={setUsUsd}
              placeholder="e.g. 245000"
            />
            <InputField
              label="US Stocks & Options SGD Equivalent"
              description="Broker-reported SGD equivalent — enter manually, do not calculate."
              value={usSgd}
              onChange={setUsSgd}
              placeholder="e.g. 332000"
            />
            <InputField
              label="Crypto Value (SGD)"
              description="Actual crypto portfolio value in SGD."
              value={crypto}
              onChange={setCrypto}
              placeholder="e.g. 18500"
            />
            <InputField
              label="SG Stocks / SG Cash Value (SGD)"
              description="Singapore stocks, ETFs, cash, or local SGD holdings."
              value={sgSgd}
              onChange={setSgSgd}
              placeholder="e.g. 78000"
            />
          </div>
        </SectionDisplay>

        <div>
          <label className="text-[10px] uppercase tracking-wider text-terminal-muted">
            Reconciliation Notes
          </label>
          <input
            type="text"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="e.g. Broker marks options at market, app uses cost basis"
            className="mt-1 w-full h-9 rounded-md border border-terminal-border bg-terminal-surface px-3 text-sm text-terminal-text focus:outline-none focus:ring-1 focus:ring-accent/50"
          />
        </div>

        <p className="text-[11px] text-terminal-muted">
          Active portfolio value:{" "}
          <span className="font-mono text-terminal-text">
            {formatSGD(metrics.portfolioValue)}
          </span>
          {comparison.useManualOverride ? " (manual SGD total)" : " (calculated)"}
          {" · "}
          App calculated: {formatSGD(calculated.portfolioValue)}
        </p>

        {error && <p className="text-xs text-loss">{error}</p>}

        <div className="flex justify-end">
          <Button variant="primary" size="sm" onClick={handleSave} disabled={saving}>
            {saving ? "Saving…" : "Save Reconciliation"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function SectionDisplay({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-md border border-terminal-border bg-terminal-elevated/30 p-3 space-y-3">
      <p className="text-[10px] font-medium uppercase tracking-wider text-terminal-muted">
        {title}
      </p>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">{children}</div>
    </div>
  );
}

function InputField({
  label,
  description,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  description: string;
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
}) {
  return (
    <div>
      <label className="text-[10px] uppercase tracking-wider text-terminal-muted">
        {label}
      </label>
      <input
        type="number"
        step="1"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="mt-1 w-full h-9 rounded-md border border-terminal-border bg-terminal-surface px-3 font-mono text-sm text-terminal-text focus:outline-none focus:ring-1 focus:ring-accent/50"
      />
      <p className="mt-1 text-[10px] text-terminal-muted">{description}</p>
    </div>
  );
}

function ComparisonBox({
  label,
  value,
  highlight,
  valueClassName,
  sub,
}: {
  label: string;
  value: string;
  highlight?: boolean;
  valueClassName?: string;
  sub?: string;
}) {
  return (
    <div
      className={cn(
        "rounded-md border px-3 py-3",
        highlight
          ? "border-accent/40 bg-accent/10"
          : "border-terminal-border bg-terminal-elevated"
      )}
    >
      <p className="text-[10px] uppercase tracking-wider text-terminal-muted">
        {label}
      </p>
      <p
        className={cn(
          "mt-1 font-mono text-lg font-semibold text-terminal-text",
          valueClassName
        )}
      >
        {value}
      </p>
      {sub && <p className="mt-1 text-[10px] text-terminal-muted">{sub}</p>}
    </div>
  );
}
