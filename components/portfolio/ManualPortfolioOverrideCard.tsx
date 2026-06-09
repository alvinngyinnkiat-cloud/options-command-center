"use client";

import { useMemo, useState, type ReactNode } from "react";
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
import type { CapitalPoolsBreakdown } from "@/lib/portfolio/capital-pools";
import {
  sumManualOverallPortfolioValueSgd,
  sumManualTradingCapitalSgd,
} from "@/lib/portfolio/manual-breakdown";
import type { PortfolioMetrics, PortfolioOverrideInput } from "@/lib/portfolio/types";
import { formatSGD } from "@/lib/utils";
import { cn } from "@/lib/utils";
import { Layers } from "lucide-react";

interface ManualPortfolioOverrideCardProps {
  metrics: PortfolioMetrics;
  pools: CapitalPoolsBreakdown;
  onSaved: (
    metrics: PortfolioMetrics,
    capitalPools: CapitalPoolsBreakdown
  ) => void;
}

function parseNum(value: string): number | null {
  const trimmed = value.trim();
  if (!trimmed) return null;
  const n = parseFloat(trimmed);
  return Number.isFinite(n) ? n : null;
}

function initialSgStocks(override: PortfolioMetrics["override"]): string {
  if (override?.manualSgStocksValueSgd != null) {
    return String(override.manualSgStocksValueSgd);
  }
  if (override?.manualSgStocksCashValueSgd != null) {
    return String(override.manualSgStocksCashValueSgd);
  }
  return "";
}

export function ManualPortfolioOverrideCard({
  metrics,
  pools,
  onSaved,
}: ManualPortfolioOverrideCardProps) {
  const override = metrics.override;
  const [usUsd, setUsUsd] = useState(
    String(override?.manualUsStocksOptionsValueUsd ?? "")
  );
  const [usSgd, setUsSgd] = useState(
    String(override?.manualUsStocksOptionsSgdEquivalent ?? "")
  );
  const [tradingCashSgd, setTradingCashSgd] = useState(
    String(
      override?.manualTradingCashSgd ?? pools.cash.tradingCashSgd ?? ""
    )
  );
  const [tradingCashUsd, setTradingCashUsd] = useState(
    String(
      override?.manualTradingCashUsd ?? pools.cash.brokerUsdCashNative ?? ""
    )
  );
  const [sgStocks, setSgStocks] = useState(initialSgStocks(override));
  const [reason, setReason] = useState(override?.overrideReason ?? "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const parsedUsUsd = parseNum(usUsd);
  const parsedUsSgd = parseNum(usSgd);
  const parsedTradingCashSgd = parseNum(tradingCashSgd);
  const parsedTradingCashUsd = parseNum(tradingCashUsd);
  const parsedSgStocks = parseNum(sgStocks);
  const cryptoPortfolioValueSgd = pools.cryptoPortfolioValueSgd;

  const breakdownComponents = useMemo(
    () => ({
      usStocksOptionsSgdEquivalent: parsedUsSgd,
      cryptoValueSgd: cryptoPortfolioValueSgd,
      sgStocksValueSgd: parsedSgStocks,
      sgCashValueSgd: null,
      tradingCashSgd: parsedTradingCashSgd,
    }),
    [parsedUsSgd, cryptoPortfolioValueSgd, parsedSgStocks, parsedTradingCashSgd]
  );

  const overallPortfolioValueSgd = useMemo(
    () => sumManualOverallPortfolioValueSgd(breakdownComponents),
    [breakdownComponents]
  );

  const tradingCapitalSgd = useMemo(
    () => sumManualTradingCapitalSgd(breakdownComponents),
    [breakdownComponents]
  );

  async function handleSave() {
    setSaving(true);
    setError(null);

    const input: PortfolioOverrideInput = {
      useManualOverride: true,
      manualUsStocksOptionsValueUsd: parsedUsUsd,
      manualUsStocksOptionsSgdEquivalent: parsedUsSgd,
      manualCryptoValueSgd: cryptoPortfolioValueSgd,
      manualSgStocksCashValueSgd: parsedSgStocks,
      manualSgStocksValueSgd: parsedSgStocks,
      manualSgCashValueSgd: null,
      manualTradingCashUsd: parsedTradingCashUsd,
      manualTradingCashSgd: parsedTradingCashSgd,
      manualCryptoCashSgd: override?.manualCryptoCashSgd ?? 0,
      manualCryptoHoldingsSgd: override?.manualCryptoHoldingsSgd ?? null,
      manualCryptoContributionsSgd: override?.manualCryptoContributionsSgd ?? null,
      manualClientPortfolioSgd: override?.manualClientPortfolioSgd ?? 0,
      manualUsdSgdRate: override?.manualUsdSgdRate ?? 1.35,
      manualTotalPortfolioValueSgd: overallPortfolioValueSgd,
      overrideReason: reason.trim() || null,
      overrideUpdatedAt: new Date().toISOString(),
    };

    const result = await savePortfolioOverride(input);
    setSaving(false);

    if (!result.success) {
      setError(result.error);
      return;
    }

    onSaved(result.metrics, result.capitalPools);
  }

  const inputClass =
    "mt-1 w-full h-9 rounded-md border border-terminal-border bg-terminal-surface px-3 font-mono text-sm text-terminal-text focus:outline-none focus:ring-1 focus:ring-accent/50";

  return (
    <Card variant="bordered">
      <CardHeader>
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-start gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-md bg-accent/15 border border-accent/20">
              <Layers className="h-4 w-4 text-accent" />
            </div>
            <div>
              <CardTitle>Manual Portfolio Breakdown</CardTitle>
              <CardDescription>
                All manually maintained portfolio values in one place. These
                fields are the source of truth for portfolio tracking.
              </CardDescription>
            </div>
          </div>
          <Badge variant="info">Source of truth</Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-5">
        <SectionDisplay title="US Portfolio">
          <InputField
            label="US Stocks & Options Value (USD)"
            description="Broker value for US stocks, ETFs, options."
            value={usUsd}
            onChange={setUsUsd}
            placeholder="e.g. 245000"
            inputClass={inputClass}
          />
          <InputField
            label="US Stocks & Options SGD Equivalent"
            description="Broker-reported SGD equivalent."
            value={usSgd}
            onChange={setUsSgd}
            placeholder="e.g. 332000"
            inputClass={inputClass}
          />
        </SectionDisplay>

        <SectionDisplay title="Trading Cash">
          <InputField
            label="Trading Cash SGD"
            description="Broker SGD cash — included in Overall Portfolio Value and Trading Capital."
            value={tradingCashSgd}
            onChange={setTradingCashSgd}
            placeholder="e.g. 24336"
            inputClass={inputClass}
          />
          <InputField
            label="Trading Cash USD"
            description="Reference only — not included in SGD totals."
            value={tradingCashUsd}
            onChange={setTradingCashUsd}
            placeholder="e.g. 18000"
            inputClass={inputClass}
          />
        </SectionDisplay>

        <SectionDisplay title="Crypto & Singapore">
          <ValueBox
            label="Current Crypto Portfolio Value (SGD)"
            value={formatSGD(cryptoPortfolioValueSgd)}
            sub="Auto-calculated — coin holdings total + exchange cash"
          />
          <InputField
            label="SG Stock Value (SGD)"
            description="Singapore stocks and ETFs."
            value={sgStocks}
            onChange={setSgStocks}
            placeholder="e.g. 70000"
            inputClass={inputClass}
          />
        </SectionDisplay>

        <SectionDisplay title="Total">
          <ValueBox
            label="Overall Portfolio Value (SGD)"
            value={
              overallPortfolioValueSgd != null
                ? formatSGD(overallPortfolioValueSgd)
                : "—"
            }
            highlight
            sub="US SGD + Trading Cash SGD + Crypto Value + SG Stock Value"
          />
          <ValueBox
            label="Trading Capital (SGD)"
            value={
              tradingCapitalSgd != null ? formatSGD(tradingCapitalSgd) : "—"
            }
            sub="US SGD + Trading Cash SGD + SG Stock Value — excludes crypto"
          />
        </SectionDisplay>

        <div>
          <label className="text-[10px] uppercase tracking-wider text-terminal-muted">
            Notes
          </label>
          <input
            type="text"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Optional notes on manual values"
            className={inputClass}
          />
        </div>

        {error && <p className="text-xs text-loss">{error}</p>}

        <div className="flex justify-end">
          <Button variant="primary" size="sm" onClick={handleSave} disabled={saving}>
            {saving ? "Saving…" : "Save Portfolio Breakdown"}
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
  children: ReactNode;
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
  inputClass,
}: {
  label: string;
  description: string;
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  inputClass: string;
}) {
  return (
    <div>
      <label className="text-[10px] uppercase tracking-wider text-terminal-muted">
        {label}
      </label>
      <input
        type="number"
        step="0.01"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className={inputClass}
      />
      <p className="mt-1 text-[10px] text-terminal-muted">{description}</p>
    </div>
  );
}

function ValueBox({
  label,
  value,
  highlight,
  sub,
}: {
  label: string;
  value: string;
  highlight?: boolean;
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
      <p className="mt-1 font-mono text-lg font-semibold text-terminal-text">
        {value}
      </p>
      {sub && <p className="mt-1 text-[10px] text-terminal-muted">{sub}</p>}
    </div>
  );
}
