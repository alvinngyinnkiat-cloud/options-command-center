"use client";

import { useMemo, useState } from "react";
import { saveCryptoManualTotals } from "@/app/actions/crypto";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/Card";
import { buildCryptoPortfolioManualState } from "@/lib/crypto/calculations";
import type { CryptoPortfolioManualState } from "@/lib/crypto/types";
import { formatSGD, formatSignedSGD } from "@/lib/utils";
import { cn } from "@/lib/utils";

interface CryptoManualPortfolioCardProps {
  portfolioManual: CryptoPortfolioManualState;
  onSaved: () => void;
}

function parseNum(value: string): number | null {
  const trimmed = value.trim();
  if (!trimmed) return null;
  const n = parseFloat(trimmed);
  return Number.isFinite(n) ? n : null;
}

export function CryptoManualPortfolioCard({
  portfolioManual,
  onSaved,
}: CryptoManualPortfolioCardProps) {
  const coinHoldingsTotal = portfolioManual.cryptoHoldingsValueSgd;
  const [cash, setCash] = useState(String(portfolioManual.cryptoCashSgd || ""));
  const [contributions, setContributions] = useState(
    String(portfolioManual.totalContributionsSgd || "")
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const preview = useMemo(() => {
    const cashVal = parseNum(cash) ?? 0;
    const contribVal = parseNum(contributions) ?? 0;
    return buildCryptoPortfolioManualState({
      cryptoHoldingsValueSgd: coinHoldingsTotal,
      cryptoCashSgd: cashVal,
      totalContributionsSgd: contribVal,
    });
  }, [coinHoldingsTotal, cash, contributions]);

  const inputClass =
    "w-full h-9 rounded-md border border-terminal-border bg-terminal-surface px-3 font-mono text-sm text-terminal-text focus:outline-none focus:ring-1 focus:ring-accent/50";

  async function handleSave() {
    setSaving(true);
    setError(null);
    const cashVal = parseNum(cash);
    const contribVal = parseNum(contributions);

    if (cashVal == null || contribVal == null) {
      setError("Enter valid SGD amounts for exchange cash and contributions.");
      setSaving(false);
      return;
    }

    const result = await saveCryptoManualTotals({
      cryptoCashSgd: cashVal,
      totalContributionsSgd: contribVal,
    });
    setSaving(false);

    if (!result.success) {
      setError(result.error);
      return;
    }

    onSaved();
  }

  return (
    <Card variant="bordered">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between gap-2">
          <CardTitle className="text-sm">Manual Crypto Portfolio</CardTitle>
          <Badge variant="outline">Manual Update</Badge>
        </div>
        <CardDescription>
          Coin Holdings Total is calculated automatically from individual coin
          values below. Edit exchange cash and contributions here.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="rounded-md border border-terminal-border/60 bg-terminal-elevated/20 px-3 py-3">
            <p className="text-[10px] uppercase tracking-wider text-terminal-muted">
              Coin Holdings Total (SGD)
            </p>
            <p className="mt-1 font-mono text-lg font-semibold text-terminal-text">
              {formatSGD(coinHoldingsTotal)}
            </p>
            <p className="mt-1 text-[10px] text-terminal-muted">
              Auto-calculated — sum of all individual coin current values
            </p>
          </div>
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
              value={cash}
              onChange={(e) => setCash(e.target.value)}
            />
            <p className="mt-1 text-[10px] text-terminal-muted">
              Actual uninvested exchange cash — not USDT, USDC, or stablecoins
            </p>
          </div>
        </div>

        <div>
          <label
            htmlFor="totalContributionsSgd"
            className="mb-1 block text-[10px] uppercase tracking-wider text-terminal-muted"
          >
            Total Crypto Contributions / Cost (SGD)
          </label>
          <input
            id="totalContributionsSgd"
            type="number"
            min="0"
            step="0.01"
            className={inputClass}
            value={contributions}
            onChange={(e) => setContributions(e.target.value)}
          />
        </div>

        <div className="rounded-md border border-terminal-border/60 bg-terminal-elevated/20 px-3 py-3 space-y-2 text-xs">
          <div className="flex justify-between gap-2">
            <span className="text-terminal-muted">
              Current Crypto Portfolio Value (SGD)
            </span>
            <span className="font-mono text-terminal-text">
              {formatSGD(preview.totalCryptoPortfolioValueSgd)}
            </span>
          </div>
          <div className="flex justify-between gap-2">
            <span className="text-terminal-muted">Crypto P/L (SGD)</span>
            <span
              className={cn(
                "font-mono font-semibold",
                preview.profitLossSgd >= 0 ? "text-profit" : "text-loss"
              )}
            >
              {formatSignedSGD(preview.profitLossSgd)}
            </span>
          </div>
          <p className="text-[10px] text-terminal-muted pt-1 border-t border-terminal-border/40">
            Portfolio Value = Coin Holdings Total + Exchange Cash · P/L =
            Portfolio Value − Contributions
          </p>
        </div>

        {error && (
          <p className="text-xs text-loss" role="alert">
            {error}
          </p>
        )}

        <Button variant="primary" size="sm" disabled={saving} onClick={handleSave}>
          {saving ? "Saving…" : "Save Exchange Cash & Contributions"}
        </Button>
      </CardContent>
    </Card>
  );
}
